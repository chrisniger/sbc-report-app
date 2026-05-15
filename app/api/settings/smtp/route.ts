import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const smtpSchema = z.object({
  host: z.string().min(1, 'Required'),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1, 'Required'),
  password: z.string().optional().or(z.literal('')),
  fromDisplay: z.string().min(1, 'Required'),
})

// ─── GET /api/settings/smtp ────────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const settings = await prisma.smtpSettings.findFirst()
    if (!settings) return Response.json(null)

    const maskedPw =
      settings.password.length >= 3
        ? settings.password.slice(0, 3) + '***'
        : '***'

    return Response.json({
      id: settings.id,
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      password: maskedPw,
      fromDisplay: settings.fromDisplay,
      updatedAt: settings.updatedAt.toISOString(),
      updatedById: settings.updatedById,
    })
  } catch (err) {
    console.error('[GET /api/settings/smtp]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/settings/smtp ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof smtpSchema>
  try {
    body = smtpSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const existing = await prisma.smtpSettings.findFirst()
    const isMasked = body.password?.includes('***')

    const data: Record<string, unknown> = {
      host: body.host.trim(),
      port: body.port,
      secure: body.secure,
      username: body.username.trim(),
      fromDisplay: body.fromDisplay.trim(),
      updatedById: session.user.id,
    }

    if (body.password && !isMasked) {
      data.password = body.password
    }

    if (existing) {
      await prisma.smtpSettings.update({ where: { id: existing.id }, data })
    } else {
      if (!body.password || isMasked) {
        return Response.json({ error: 'Password required for initial setup' }, { status: 400 })
      }
      await prisma.smtpSettings.create({
        data: {
          host: body.host.trim(),
          port: body.port,
          secure: body.secure,
          username: body.username.trim(),
          password: body.password,
          fromDisplay: body.fromDisplay.trim(),
          updatedById: session.user.id,
        },
      })
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'SMTP_SETTINGS_UPDATED',
        description: `Admin updated SMTP settings (host: ${body.host})`,
        entityType: 'SmtpSettings',
      },
    }).catch(() => null)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/settings/smtp]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
