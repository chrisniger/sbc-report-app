import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name required'),
  description: z.string().optional().or(z.literal('')),
  hodId: z.string().optional().or(z.literal('')),
  pastorId: z.string().optional().or(z.literal('')),
})

// ─── GET /api/teams ────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roles = session.user.roles

  try {
    let whereClause: Record<string, unknown> = {}

    if (roles.includes('SUPERVISOR_PASTOR')) {
      const pastorProfile = await prisma.pastorProfile.findUnique({
        where: { userId: session.user.id },
      })
      if (!pastorProfile) return Response.json([])
      whereClause = { pastorId: pastorProfile.id }
    } else if (roles.includes('HOD')) {
      const hodProfile = await prisma.hodProfile.findUnique({
        where: { userId: session.user.id },
      })
      if (!hodProfile) return Response.json([])
      whereClause = { hodId: hodProfile.id }
    }
    // ADMIN and HEAD_OF_SUPERVISOR see all teams

    const teams = await prisma.serviceTeam.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        hod: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        pastor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        members: { select: { id: true } },
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, reportMonth: true, reportYear: true, status: true, createdAt: true },
        },
      },
    })

    return Response.json(teams)
  } catch (err) {
    console.error('[GET /api/teams]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/teams ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof createTeamSchema>
  try {
    body = createTeamSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const existing = await prisma.serviceTeam.findUnique({ where: { name: body.name.trim() } })
  if (existing) return Response.json({ error: 'Team name already exists' }, { status: 409 })

  const hodProfileId = body.hodId?.trim() || null
  const pastorProfileId = body.pastorId?.trim() || null

  try {
    const team = await prisma.serviceTeam.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        hodId: hodProfileId,
        pastorId: pastorProfileId,
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'TEAM_CREATED',
        description: `Admin created service team "${team.name}"`,
        entityType: 'ServiceTeam',
        entityId: team.id,
      },
    }).catch(() => null)

    return Response.json({ id: team.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/teams]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
