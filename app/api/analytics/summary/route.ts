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
  const now = new Date()
  const month = url.searchParams.get('month') ? parseInt(url.searchParams.get('month')!) : now.getMonth() + 1
  const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!) : now.getFullYear()

  try {
    let scopeWhere: Prisma.HodReportWhereInput = {}

    if (roles.includes('HOD')) {
      const hod = await prisma.hodProfile.findUnique({ where: { userId: session.user.id } })
      if (!hod) return Response.json({ error: 'Profile not found' }, { status: 404 })
      scopeWhere = { hodProfileId: hod.id }
    } else if (roles.includes('SUPERVISOR_PASTOR')) {
      const scope = await getSupervisedPastorScope(session.user.id)
      if (!scope) return Response.json({ error: 'Profile not found' }, { status: 404 })
      scopeWhere = { hodProfileId: { in: scope.hodIds }, serviceTeamId: { in: scope.teamIds } }
    }

    const thisMonthWhere: Prisma.HodReportWhereInput = {
      ...scopeWhere,
      reportMonth: month,
      reportYear: year,
      status: { not: 'DRAFT' },
    }

    const [totalReports, totalMembers, activeTeams, statusGroups, thisMonthAvg, thisMonthCount] =
      await Promise.all([
        prisma.hodReport.count({ where: scopeWhere }),
        prisma.serviceTeamMember.count({ where: { isActive: true } }),
        prisma.serviceTeam.count({ where: { isActive: true } }),
        prisma.hodReport.groupBy({
          by: ['status'],
          _count: { id: true },
          where: scopeWhere,
        }),
        prisma.reportMemberGrade.aggregate({
          where: {
            report: thisMonthWhere,
            averageScore: { not: null },
          },
          _avg: { averageScore: true },
        }),
        prisma.hodReport.count({ where: thisMonthWhere }),
      ])

    const submissionRate = activeTeams > 0 ? Math.round((thisMonthCount / activeTeams) * 100) : 0

    return Response.json({
      stats: {
        totalReports,
        reportsThisMonth: thisMonthCount,
        totalMembers,
        averageScore: thisMonthAvg._avg.averageScore ?? null,
        submissionRate,
      },
      statusDistribution: statusGroups.map(g => ({ status: g.status as string, count: g._count.id })),
    })
  } catch (err) {
    console.error('[GET /api/analytics/summary]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
