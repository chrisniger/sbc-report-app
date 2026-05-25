import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ─── DELETE /api/members/[id]/teams/[teamId] ───────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
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

  const { id, teamId } = await params

  try {
    const assignment = await prisma.serviceTeamMemberAssignment.findUnique({
      where: { memberId_teamId: { memberId: id, teamId } },
      include: {
        member: { select: { fullName: true } },
        team: { select: { id: true, name: true, hodId: true } },
      },
    })

    if (!assignment) {
      return Response.json({ error: 'Member is not assigned to this team' }, { status: 404 })
    }

    if (isHod && !isAdmin) {
      const hodProfile = await prisma.hodProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      })
      if (!hodProfile || assignment.team.hodId !== hodProfile.id) {
        return Response.json({ error: 'You can only remove members from your own teams' }, { status: 403 })
      }
    }

    await prisma.serviceTeamMemberAssignment.delete({
      where: { memberId_teamId: { memberId: id, teamId } },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'MEMBER_TEAM_REMOVED',
        description: `${isAdmin ? 'Admin' : 'HOSTs'} removed "${assignment.member.fullName}" from team "${assignment.team.name}"`,
        entityType: 'ServiceTeamMember',
        entityId: id,
      },
    }).catch(() => null)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/members/:id/teams/:teamId]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
