import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const notifSchema = z.object({
  event: z.string().min(1, 'Required'),
  recipientEmail: z.string().email('Valid email required'),
  recipientName: z.string().optional().or(z.literal('')),
  serviceTeamId: z.string().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

// ─── GET /api/settings/notifications ──────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const records = await prisma.notificationSetting.findMany({
      orderBy: { createdAt: 'asc' },
    })

    const teamIds = [...new Set(records.map((r) => r.serviceTeamId).filter(Boolean))] as string[]
    const teams =
      teamIds.length > 0
        ? await prisma.serviceTeam.findMany({
            where: { id: { in: teamIds } },
            select: { id: true, name: true },
          })
        : []

    const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]))

    return Response.json(
      records.map((r) => ({
        ...r,
        serviceTeamName: r.serviceTeamId ? (teamMap[r.serviceTeamId] ?? null) : null,
        createdAt: r.createdAt.toISOString(),
      }))
    )
  } catch (err) {
    console.error('[GET /api/settings/notifications]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/settings/notifications ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof notifSchema>
  try {
    body = notifSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const record = await prisma.notificationSetting.create({
      data: {
        event: body.event,
        recipientEmail: body.recipientEmail.trim(),
        recipientName: body.recipientName?.trim() || null,
        serviceTeamId: body.serviceTeamId?.trim() || null,
        isActive: body.isActive ?? true,
      },
    })
    return Response.json({ id: record.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/settings/notifications]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
