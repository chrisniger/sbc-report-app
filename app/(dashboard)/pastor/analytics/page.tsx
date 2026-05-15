import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import PastorAnalyticsClient from '@/components/analytics/PastorAnalyticsClient'
import type { TeamScorePoint } from '@/components/charts/TeamScoreBar'
import type { TrendPoint } from '@/components/charts/ScoreTrendChart'
import type { MemberRow } from '@/components/charts/MemberScoreTable'

function build6Months() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    }
  })
}

async function getData(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const months6 = build6Months()

  const pastorProfile = await prisma.pastorProfile.findUnique({
    where: { userId },
    include: { serviceTeams: { select: { id: true, name: true } } },
  })
  if (!pastorProfile) return null

  const teamIds = pastorProfile.serviceTeams.map(t => t.id)

  const [statusGroups, thisMonthCount, thisMonthAvg, pendingReviews, trendReports, topMemberGroups] =
    await Promise.all([
      prisma.hodReport.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { serviceTeamId: { in: teamIds } },
      }),
      prisma.hodReport.count({
        where: { serviceTeamId: { in: teamIds }, reportMonth: month, reportYear: year, status: { not: 'DRAFT' } },
      }),
      prisma.reportMemberGrade.aggregate({
        where: {
          report: { serviceTeamId: { in: teamIds }, reportMonth: month, reportYear: year, status: { not: 'DRAFT' } },
          averageScore: { not: null },
        },
        _avg: { averageScore: true },
      }),
      prisma.hodReport.count({
        where: { serviceTeamId: { in: teamIds }, status: 'SUBMITTED' },
      }),
      prisma.hodReport.findMany({
        where: {
          serviceTeamId: { in: teamIds },
          OR: months6.map(m => ({ reportMonth: m.month, reportYear: m.year })),
          status: { not: 'DRAFT' },
        },
        include: {
          serviceTeam: { select: { name: true } },
          memberGrades: { select: { averageScore: true } },
        },
      }),
      prisma.reportMemberGrade.groupBy({
        by: ['memberId'],
        _avg: { averageScore: true },
        _count: { id: true },
        where: {
          report: { serviceTeamId: { in: teamIds } },
          averageScore: { not: null },
        },
        orderBy: { _avg: { averageScore: 'desc' } },
        take: 10,
      }),
    ])

  // Team scores current month
  const currentReports = trendReports.filter(r => r.reportMonth === month && r.reportYear === year)
  const teamScoreMap = new Map<string, { scores: number[] }>()
  for (const r of currentReports) {
    if (!teamScoreMap.has(r.serviceTeam.name)) teamScoreMap.set(r.serviceTeam.name, { scores: [] })
    for (const g of r.memberGrades) {
      if (g.averageScore != null) teamScoreMap.get(r.serviceTeam.name)!.scores.push(g.averageScore)
    }
  }
  const teamScores: TeamScorePoint[] = [...teamScoreMap.entries()]
    .map(([name, { scores }]) => ({
      name,
      displayName: name.length > 14 ? name.slice(0, 13) + '…' : name,
      avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      membersGraded: scores.length,
    }))
    .filter(t => t.membersGraded > 0)
    .sort((a, b) => b.avgScore - a.avgScore)

  // Teams for trend — all pastor's teams
  const teamNames = pastorProfile.serviceTeams.map(t => t.name)
  const trendData: TrendPoint[] = months6.map(m => {
    const point: TrendPoint = { label: m.label }
    for (const teamName of teamNames) {
      const scores = trendReports
        .filter(r => r.reportMonth === m.month && r.reportYear === m.year && r.serviceTeam.name === teamName)
        .flatMap(r => r.memberGrades.map(g => g.averageScore).filter((s): s is number => s != null))
      point[teamName] = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    }
    return point
  })

  // Top members
  const memberIds = topMemberGroups.map(g => g.memberId)
  const memberDetails = await prisma.serviceTeamMember.findMany({
    where: { id: { in: memberIds } },
    include: { teamAssignments: { take: 1, include: { team: { select: { name: true } } } } },
  })
  const memberMap = new Map(memberDetails.map(m => [m.id, m]))
  const topMembers: MemberRow[] = topMemberGroups
    .filter(g => g._avg.averageScore != null)
    .map((g, i) => {
      const m = memberMap.get(g.memberId)
      return {
        rank: i + 1,
        name: m?.fullName ?? '—',
        team: m?.teamAssignments[0]?.team.name ?? '—',
        avgScore: g._avg.averageScore!,
        reportsCount: g._count.id,
      }
    })

  return {
    stats: {
      myTeamsCount: teamIds.length,
      submittedThisMonth: thisMonthCount,
      averageScore: thisMonthAvg._avg.averageScore ?? null,
      pendingReviews,
    },
    teamScores,
    statusDistribution: statusGroups.map(g => ({ status: g.status as string, count: g._count.id })),
    trendData,
    trendTeams: teamNames,
    topMembers,
  }
}

export default async function PastorAnalyticsPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('SUPERVISOR_PASTOR')) redirect('/dashboard')

  const data = await getData(session.user.id)
  if (!data) redirect('/login')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-sbc-black dark:text-white tracking-widest">
          ANALYTICS
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Performance overview for your assigned teams</p>
      </div>
      <PastorAnalyticsClient {...data} />
    </div>
  )
}
