import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ─── DELETE /api/members/[id]/teams/[teamId] ───────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, teamId } = await params

  try {
    await prisma.serviceTeamMemberAssignment.delete({
      where: { memberId_teamId: { memberId: id, teamId } },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'MEMBER_TEAM_REMOVED',
        description: `Admin removed member ${id} from team ${teamId}`,
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
