import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const adminUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name required').optional(),
  lastName: z.string().min(1, 'Last name required').optional(),
  phone: z.string().min(7, 'Valid phone required').optional(),
  homeLocation: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})

const hodUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name required').optional(),
  lastName: z.string().min(1, 'Last name required').optional(),
  homeLocation: z.string().optional().or(z.literal('')),
})

// ─── PATCH /api/members/[id] ───────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roles = session.user.roles
  const isAdmin = roles.includes('ADMIN')
  const isHod = roles.includes('HOD')

  if (!isAdmin && !isHod) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const member = await prisma.serviceTeamMember.findUnique({
    where: { id },
    include: {
      teamAssignments: { select: { teamId: true } },
    },
  })
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 })

  // HOD can only edit members in their own teams
  if (isHod && !isAdmin) {
    const hodProfile = await prisma.hodProfile.findUnique({
      where: { userId: session.user.id },
      include: { serviceTeams: { select: { id: true } } },
    })
    if (!hodProfile) return Response.json({ error: 'HOSTs profile not found' }, { status: 403 })

    const hodTeamIds = hodProfile.serviceTeams.map((t) => t.id)
    const memberTeamIds = member.teamAssignments.map((a) => a.teamId)
    const hasAccess = memberTeamIds.some((tid) => hodTeamIds.includes(tid))
    if (!hasAccess) {
      return Response.json({ error: 'Member does not belong to your team' }, { status: 403 })
    }
  }

  let body: Record<string, unknown>
  try {
    const raw = await request.json()
    if (isAdmin) {
      body = adminUpdateSchema.parse(raw)
    } else {
      body = hodUpdateSchema.parse(raw)
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'issues' in err) {
      const firstIssue = (err as { issues: { message: string }[] }).issues[0]
      return Response.json({ error: firstIssue?.message ?? 'Invalid request' }, { status: 400 })
    }
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (isAdmin && body.phone && body.phone !== member.phone) {
    const existing = await prisma.serviceTeamMember.findUnique({ where: { phone: body.phone as string } })
    if (existing) return Response.json({ error: 'Phone number already in use' }, { status: 409 })
  }

  const firstName = (body.firstName as string | undefined)?.trim() ?? member.firstName
  const lastName = (body.lastName as string | undefined)?.trim() ?? member.lastName
  const fullName = `${firstName} ${lastName}`

  try {
    const updateData: Record<string, unknown> = {
      firstName,
      lastName,
      fullName,
      homeLocation: (body.homeLocation as string | undefined)?.trim() || null,
    }

    if (isAdmin) {
      if (body.phone) updateData.phone = (body.phone as string).trim()
      if (body.email !== undefined) updateData.email = (body.email as string)?.trim() || null
    }

    await prisma.serviceTeamMember.update({ where: { id }, data: updateData })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'MEMBER_UPDATED',
        description: `${isAdmin ? 'Admin' : 'HOSTs'} updated member "${fullName}"`,
        entityType: 'ServiceTeamMember',
        entityId: id,
      },
    }).catch(() => null)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/members/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
