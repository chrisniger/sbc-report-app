import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ─── Validation schemas ────────────────────────────────────────────────────

const memberSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  phone: z.string().min(7, 'Valid phone required'),
  homeLocation: z.string().optional(),
  teamId: z.string().min(1, 'Team required'),
  email: z.string().email().optional().or(z.literal('')),
})

type MemberBody = z.infer<typeof memberSchema>

// ─── POST /api/members ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: MemberBody
  try {
    const raw = await request.json()
    body = memberSchema.parse(raw)
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const roles = session.user.roles

  // HOD must own the team
  if (roles.includes('HOD')) {
    const hodProfile = await prisma.hodProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!hodProfile) return Response.json({ error: 'HOD profile not found' }, { status: 404 })

    const team = await prisma.serviceTeam.findFirst({
      where: { id: body.teamId, hodId: hodProfile.id },
    })
    if (!team) return Response.json({ error: 'Team not assigned to you' }, { status: 403 })
  }

  try {
    const normalizedPhone = body.phone.trim()
    const existing = await prisma.serviceTeamMember.findUnique({
      where: { phone: normalizedPhone },
    })

    if (existing) {
      // Add team assignment if not already there
      const alreadyAssigned = await prisma.serviceTeamMemberAssignment.findUnique({
        where: { memberId_teamId: { memberId: existing.id, teamId: body.teamId } },
      })
      if (!alreadyAssigned) {
        await prisma.serviceTeamMemberAssignment.create({
          data: { memberId: existing.id, teamId: body.teamId },
        })
      }
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'MEMBER_TEAM_ASSIGNED',
          description: `Member "${existing.fullName}" (${normalizedPhone}) added to team`,
          entityType: 'ServiceTeamMember',
          entityId: existing.id,
        },
      }).catch(() => null)
      return Response.json({ id: existing.id, action: 'assigned' })
    }

    // Create new member
    const fullName = `${body.firstName.trim()} ${body.lastName.trim()}`
    const member = await prisma.serviceTeamMember.create({
      data: {
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        fullName,
        phone: normalizedPhone,
        homeLocation: body.homeLocation?.trim() || null,
        email: body.email?.trim() || null,
        createdById: session.user.id,
        teamAssignments: {
          create: { teamId: body.teamId },
        },
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'MEMBER_ADDED',
        description: `New member "${fullName}" (${normalizedPhone}) registered`,
        entityType: 'ServiceTeamMember',
        entityId: member.id,
      },
    }).catch(() => null)

    return Response.json({ id: member.id, action: 'created' }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return Response.json({ error: 'Phone number already exists' }, { status: 409 })
    }
    console.error('[POST /api/members]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET /api/members ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const teamId = url.searchParams.get('teamId')

  const roles = session.user.roles

  try {
    let teamIds: string[] | null = null

    if (roles.includes('HOD')) {
      const hodProfile = await prisma.hodProfile.findUnique({
        where: { userId: session.user.id },
        include: { serviceTeams: { select: { id: true } } },
      })
      if (!hodProfile) return Response.json([])
      teamIds = hodProfile.serviceTeams.map((t) => t.id)
    } else if (roles.includes('SUPERVISOR_PASTOR')) {
      const pastorProfile = await prisma.pastorProfile.findUnique({
        where: { userId: session.user.id },
        include: { serviceTeams: { select: { id: true } } },
      })
      if (!pastorProfile) return Response.json([])
      teamIds = pastorProfile.serviceTeams.map((t) => t.id)
    }

    const where: Record<string, unknown> = { isActive: true }
    if (teamId) {
      where.teamAssignments = { some: { teamId } }
    } else if (teamIds !== null) {
      where.teamAssignments = { some: { teamId: { in: teamIds } } }
    }

    const members = await prisma.serviceTeamMember.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: {
        teamAssignments: {
          include: { team: { select: { id: true, name: true } } },
        },
        reportGrades: {
          select: { averageScore: true },
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    })

    return Response.json(members)
  } catch (err) {
    console.error('[GET /api/members]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
