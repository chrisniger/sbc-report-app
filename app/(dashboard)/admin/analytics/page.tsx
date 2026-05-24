import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AdminAnalyticsClient from '@/components/analytics/AdminAnalyticsClient'
import type { TeamScorePoint } from '@/components/charts/TeamScoreBar'
import type { TrendPoint } from '@/components/charts/ScoreTrendChart'
import type { MemberRow } from '@/components/charts/MemberScoreTable'

function build12Months() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    }
  })
}

async function getData() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const months12 = build12Months()

  const [
    totalReports,
    totalMembers,
    activeTeams,
    statusGroups,
    thisMonthCount,
    thisMonthAvg,
    trendReports,
    topMemberGroups,
  ] = await Promise.all([
    prisma.hodReport.count(),
    prisma.serviceTeamMember.count({ where: { isActive: true } }),
    prisma.serviceTeam.count({ where: { isActive: true } }),
    prisma.hodReport.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.hodReport.count({
      where: { reportMonth: month, reportYear: year, status: { not: 'DRAFT' } },
    }),
    prisma.reportMemberGrade.aggregate({
      where: {
        report: { reportMonth: month, reportYear: year, status: { not: 'DRAFT' } },
        averageScore: { not: null },
      },
      _avg: { averageScore: true },
    }),
    prisma.hodReport.findMany({
      where: {
        OR: months12.map(m => ({ reportMonth: m.month, reportYear: m.year })),
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
      where: { averageScore: { not: null } },
      orderBy: { _avg: { averageScore: 'desc' } },
      take: 10,
    }),
  ])

  type TrendReport = (typeof trendReports)[number]
  type TrendMemberGrade = TrendReport['memberGrades'][number]

  // Team scores for current month
  const currentReports = trendReports.filter(
    (r: TrendReport) => r.reportMonth === month && r.reportYear === year
  )
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

  // Top 5 teams for trend
  const allTeamMap = new Map<string, number[]>()
  for (const r of trendReports) {
    if (!allTeamMap.has(r.serviceTeam.name)) allTeamMap.set(r.serviceTeam.name, [])
    for (const g of r.memberGrades) {
      if (g.averageScore != null) allTeamMap.get(r.serviceTeam.name)!.push(g.averageScore)
    }
  }
  const top5Teams = [...allTeamMap.entries()]
    .map(([name, scores]) => ({
      name,
      avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
    .map(t => t.name)

  const trendData: TrendPoint[] = months12.map(m => {
    const point: TrendPoint = { label: m.label }
    for (const teamName of top5Teams) {
      const scores = trendReports
        .filter((r: TrendReport) => r.reportMonth === m.month && r.reportYear === m.year && r.serviceTeam.name === teamName)
        .flatMap((r: TrendReport) => r.memberGrades.map((g: TrendMemberGrade) => g.averageScore).filter((s: unknown): s is number => s != null))
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
      totalReports,
      reportsThisMonth: thisMonthCount,
      totalMembers,
      averageScore: thisMonthAvg._avg.averageScore ?? null,
      submissionRate: activeTeams > 0 ? Math.round((thisMonthCount / activeTeams) * 100) : 0,
    },
    teamScores,
    statusDistribution: statusGroups.map(g => ({ status: g.status as string, count: g._count.id })),
    trendData,
    trendTeams: top5Teams,
    topMembers,
  }
}

export default async function AdminAnalyticsPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) redirect('/dashboard')

  const data = await getData()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-sbc-black dark:text-white tracking-widest">
          ANALYTICS
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">System-wide performance overview</p>
      </div>
      <AdminAnalyticsClient {...data} />
    </div>
  )
}
