import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { type Prisma } from '@prisma/client'
import { getSupervisedPastorScope } from '@/lib/pastor-scope'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = session.user.roles as string[]
  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10'), 50)
  const monthParam = url.searchParams.get('month')
  const yearParam = url.searchParams.get('year')
  const teamIdParam = url.searchParams.get('teamId')

  try {
    let reportWhere: Prisma.HodReportWhereInput = {}

    if (roles.includes('HOD')) {
      const hod = await prisma.hodProfile.findUnique({ where: { userId: session.user.id } })
      if (!hod) return Response.json({ error: 'Profile not found' }, { status: 404 })
      reportWhere = { hodProfileId: hod.id }
    } else if (roles.includes('SUPERVISOR_PASTOR')) {
      const scope = await getSupervisedPastorScope(session.user.id)
      if (!scope) return Response.json({ error: 'Profile not found' }, { status: 404 })
      reportWhere = { hodProfileId: { in: scope.hodIds }, serviceTeamId: { in: scope.teamIds } }
    }

    if (monthParam) reportWhere = { ...reportWhere, reportMonth: parseInt(monthParam) }
    if (yearParam) reportWhere = { ...reportWhere, reportYear: parseInt(yearParam) }
    if (teamIdParam) reportWhere = { ...reportWhere, serviceTeamId: teamIdParam }

    const gradeWhere: Prisma.ReportMemberGradeWhereInput = {
      averageScore: { not: null },
      report: { ...reportWhere, status: { not: 'DRAFT' } },
    }

    const groups = await prisma.reportMemberGrade.groupBy({
      by: ['memberId'],
      _avg: { averageScore: true },
      _count: { id: true },
      where: gradeWhere,
      orderBy: { _avg: { averageScore: 'desc' } },
      take: limit,
    })

    const memberIds = groups.map(g => g.memberId)
    const members = await prisma.serviceTeamMember.findMany({
      where: { id: { in: memberIds } },
      include: {
        teamAssignments: {
          take: 1,
          include: { team: { select: { name: true } } },
        },
      },
    })
    const memberMap = new Map(members.map(m => [m.id, m]))

    const result = groups
      .filter(g => g._avg.averageScore != null)
      .map((g, i) => {
        const member = memberMap.get(g.memberId)
        return {
          rank: i + 1,
          name: member?.fullName ?? '—',
          team: member?.teamAssignments[0]?.team.name ?? '—',
          avgScore: g._avg.averageScore!,
          reportsCount: g._count.id,
        }
      })

    return Response.json(result)
  } catch (err) {
    console.error('[GET /api/analytics/members]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
