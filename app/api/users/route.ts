import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/mailer'

const createUserSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  username: z.string().min(2, 'Min 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(8, 'Min 8 characters'),
  roles: z.array(z.enum(['ADMIN', 'HEAD_OF_SUPERVISOR', 'SUPERVISOR_PASTOR', 'HOD'])).min(1, 'Select at least one role'),
  teamIds: z.array(z.string()).optional(),
  supervisorId: z.string().optional().or(z.literal('')),
  headId: z.string().optional().or(z.literal('')),
})

// ─── GET /api/users ────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        hodProfile: {
          include: {
            serviceTeams: { select: { id: true, name: true } },
            supervisor: { select: { id: true, pastorName: true } },
          },
        },
        pastorProfile: {
          include: {
            head: { select: { id: true, headName: true } },
          },
        },
        headProfile: {
          select: { id: true, headName: true },
        },
      },
    })

    return Response.json(
      users.map(({ passwordHash: _pw, ...u }) => u)
    )
  } catch (err) {
    console.error('[GET /api/users]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/users ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof createUserSchema>
  try {
    body = createUserSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = body.email?.trim() || null
  const phone = body.phone?.trim() || null

  const [existingUsername, existingEmail, existingPhone] = await Promise.all([
    prisma.user.findUnique({ where: { username: body.username.trim() } }),
    email ? prisma.user.findFirst({ where: { email } }) : Promise.resolve(null),
    phone ? prisma.user.findFirst({ where: { phone } }) : Promise.resolve(null),
  ])

  if (existingUsername) return Response.json({ error: 'Username already taken' }, { status: 409 })
  if (existingEmail) return Response.json({ error: 'Email already in use' }, { status: 409 })
  if (existingPhone) return Response.json({ error: 'Phone number already in use' }, { status: 409 })

  const passwordHash = await bcrypt.hash(body.password, 12)
  const displayName = `${body.firstName.trim()} ${body.lastName.trim()}`
  const supervisorId = body.supervisorId?.trim() || null
  const headId = body.headId?.trim() || null

  try {
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          username: body.username.trim(),
          email,
          phone,
          passwordHash,
          roles: body.roles,
          mustChangePassword: true,
        },
      })

      if (body.roles.includes('HOD')) {
        await tx.hodProfile.create({
          data: {
            userId: newUser.id,
            hodName: displayName,
            supervisorId: supervisorId || null,
            ...(body.teamIds?.length
              ? { serviceTeams: { connect: body.teamIds.map((id) => ({ id })) } }
              : {}),
          },
        })
      }

      if (body.roles.includes('SUPERVISOR_PASTOR')) {
        await tx.pastorProfile.create({
          data: {
            userId: newUser.id,
            pastorName: displayName,
            headId: headId || null,
          },
        })
      }

      if (body.roles.includes('HEAD_OF_SUPERVISOR')) {
        await tx.headOfSupervisorProfile.create({
          data: {
            userId: newUser.id,
            headName: displayName,
          },
        })
      }

      return newUser
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_CREATED',
        description: `Admin created user "${body.username}" with roles: ${body.roles.join(', ')}`,
        entityType: 'User',
        entityId: user.id,
      },
    }).catch(() => null)

    if (email) {
      sendWelcomeEmail({
        to: email,
        recipientName: body.firstName.trim(),
        username: body.username.trim(),
        temporaryPassword: body.password,
      }).catch(() => null)
    }

    return Response.json({ id: user.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/users]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
