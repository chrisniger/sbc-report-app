import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { getSupervisedPastorScope } from '@/lib/pastor-scope'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = session.user.roles as string[]
  const url = new URL(request.url)
  const teamIdsParam = url.searchParams.get('teamIds')

  const now = new Date()
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    }
  })

  try {
    let baseWhere: Prisma.HodReportWhereInput = {
      OR: months12.map(m => ({ reportMonth: m.month, reportYear: m.year })),
      status: { not: 'DRAFT' },
    }

    if (teamIdsParam) {
      const ids = teamIdsParam.split(',').filter(Boolean)
      if (ids.length) baseWhere = { ...baseWhere, serviceTeamId: { in: ids } }
    } else if (roles.includes('HOD')) {
      const hod = await prisma.hodProfile.findUnique({ where: { userId: session.user.id } })
      if (hod) baseWhere = { ...baseWhere, hodProfileId: hod.id }
    } else if (roles.includes('SUPERVISOR_PASTOR')) {
      const scope = await getSupervisedPastorScope(session.user.id)
      if (scope) {
        baseWhere = {
          ...baseWhere,
          hodProfileId: { in: scope.hodIds },
          serviceTeamId: { in: scope.teamIds },
        }
      }
    }

    const reports = await prisma.hodReport.findMany({
      where: baseWhere,
      include: {
        serviceTeam: { select: { name: true } },
        memberGrades: { select: { averageScore: true } },
      },
    })

    const teamMap = new Map<string, number[]>()
    for (const r of reports) {
      if (!teamMap.has(r.serviceTeam.name)) teamMap.set(r.serviceTeam.name, [])
      for (const g of r.memberGrades) {
        if (g.averageScore != null) teamMap.get(r.serviceTeam.name)!.push(g.averageScore)
      }
    }
    const top5 = [...teamMap.entries()]
      .map(([name, scores]) => ({
        name,
        avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map(t => t.name)

    const trendData = months12.map(m => {
      const point: Record<string, number | string | null> = { label: m.label }
      for (const teamName of top5) {
        const scores = reports
          .filter(r => r.reportMonth === m.month && r.reportYear === m.year && r.serviceTeam.name === teamName)
          .flatMap(r => r.memberGrades.map(g => g.averageScore).filter((s): s is number => s != null))
        point[teamName] = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
      }
      return point
    })

    return Response.json({ trendData, teams: top5 })
  } catch (err) {
    console.error('[GET /api/analytics/trend]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
