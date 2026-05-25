import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import type { PoolConfig } from 'mariadb'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function readNumber(value: string | null | undefined, fallback: number) {
  if (!value) return fallback

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function createPoolConfig(databaseUrl: string): PoolConfig | string {
  try {
    const url = new URL(databaseUrl)

    if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
      return databaseUrl
    }

    return {
      host: url.hostname,
      port: readNumber(url.port, 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, '')),
      connectionLimit: readNumber(
        process.env.DB_CONNECTION_LIMIT ??
          url.searchParams.get('connectionLimit') ??
          url.searchParams.get('connection_limit'),
        1
      ),
      acquireTimeout: readNumber(
        process.env.DB_ACQUIRE_TIMEOUT ??
          url.searchParams.get('acquireTimeout') ??
          url.searchParams.get('pool_timeout'),
        30000
      ),
      idleTimeout: readNumber(
        process.env.DB_IDLE_TIMEOUT ?? url.searchParams.get('idleTimeout'),
        60
      ),
      minimumIdle: 0,
      prepareCacheLength: 0,
    }
  } catch {
    return databaseUrl
  }
}

function createClient() {
  const adapter = new PrismaMariaDb(createPoolConfig(process.env.DATABASE_URL!))
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
