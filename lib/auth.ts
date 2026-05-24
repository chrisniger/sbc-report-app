import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { ROLE_ROUTES, primaryRole } from '@/lib/roles'
import type { Role } from '@/lib/roles'

// ─────────────────────────────────────────────
// Type augmentation
// ─────────────────────────────────────────────

declare module 'next-auth' {
  interface User {
    id: string
    username: string
    firstName: string
    lastName: string | null
    roles: string[]
    mustChangePassword: boolean
  }
  interface Session {
    user: {
      id: string
      username: string
      email: string
      firstName: string
      lastName: string | null
      roles: string[]
      mustChangePassword: boolean
    }
  }
}

// next-auth/jwt augmentation not available in this beta; token fields are typed via JWT callback

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined
        const password = credentials?.password as string | undefined
        if (!username || !password) return null

        const user = await prisma.user.findUnique({ where: { username } })
        if (!user || !user.isActive) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          username: user.username,
          email: user.email ?? '',
          firstName: user.firstName,
          lastName: user.lastName ?? null,
          roles: (user.roles as string[]) ?? [],
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.firstName = user.firstName
        token.lastName = user.lastName ?? null
        token.roles = user.roles
        token.mustChangePassword = user.mustChangePassword
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.firstName = token.firstName as string
      session.user.lastName = token.lastName as string | null
      session.user.roles = token.roles as string[]
      session.user.mustChangePassword = token.mustChangePassword as boolean
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const path = nextUrl.pathname

      // Always allow NextAuth API routes
      if (path.startsWith('/api/auth')) return true

      // Login page — redirect already-logged-in users to their dashboard
      if (path === '/login') {
        if (isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl))
        return true
      }

      // Require authentication for everything else
      if (!isLoggedIn) return false

      // Role-based path gating
      const userRoles = auth.user.roles
      const dominant = primaryRole(userRoles)
      if (dominant) {
        const allowed = ROLE_ROUTES[dominant as Role]
        const pathAllowed = allowed.some((prefix) => path.startsWith(prefix))
        if (!pathAllowed && path !== '/dashboard' && !path.startsWith('/api/')) {
          return Response.redirect(new URL('/dashboard', nextUrl))
        }
      }

      return true
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
