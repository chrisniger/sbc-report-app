import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import HeadAnalyticsClient from '@/components/analytics/HeadAnalyticsClient'
import type { TeamScorePoint } from '@/components/charts/TeamScoreBar'
import type { TrendPoint } from '@/components/charts/ScoreTrendChart'
import type { MemberRow } from '@/components/charts/MemberScoreTable'
import type { PastorBarEntry } from '@/components/charts/PastorGroupedBar'

type MemberDetail = {
  id: string
  fullName: string
  teamAssignments: { team: { name: string } }[]
}
type TeamAverage = { name: string; avg: number }

function build12Months() {
  const now = new Date()
  return Array.from({ length: 12 }, (_: unknown, i: number) => {
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
    pastors,
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
        OR: months12.map((m: (typeof months12)[number]) => ({ reportMonth: m.month, reportYear: m.year })),
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
    prisma.pastorProfile.findMany({
      include: {
        serviceTeams: {
          where: { isActive: true },
          select: { id: true, name: true },
        },
      },
    }),
  ])

  type TrendReport = (typeof trendReports)[number]
  type TrendMemberGrade = TrendReport['memberGrades'][number]
  type MonthPoint = (typeof months12)[number]
  type TopMemberGroup = (typeof topMemberGroups)[number]
  type StatusGroup = (typeof statusGroups)[number]
  type PastorSource = (typeof pastors)[number]
  type PastorTeam = PastorSource['serviceTeams'][number]

  // Team scores current month
  const currentReports = trendReports.filter((r: TrendReport) => r.reportMonth === month && r.reportYear === year)
  const teamScoreMap = new Map<string, { scores: number[] }>()
  for (const r of currentReports) {
    if (!teamScoreMap.has(r.serviceTeam.name)) teamScoreMap.set(r.serviceTeam.name, { scores: [] })
    for (const g of r.memberGrades) {
      if (g.averageScore != null) teamScoreMap.get(r.serviceTeam.name)!.scores.push(g.averageScore)
    }
  }
  const teamScores: TeamScorePoint[] = [...teamScoreMap.entries()]
    .map(([name, { scores }]: [string, { scores: number[] }]) => ({
      name,
      displayName: name.length > 14 ? name.slice(0, 13) + '…' : name,
      avgScore: scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0,
      membersGraded: scores.length,
    }))
    .filter((t: TeamScorePoint) => t.membersGraded > 0)
    .sort((a: TeamScorePoint, b: TeamScorePoint) => b.avgScore - a.avgScore)

  // Top 5 teams for trend
  const allTeamMap = new Map<string, number[]>()
  for (const r of trendReports) {
    if (!allTeamMap.has(r.serviceTeam.name)) allTeamMap.set(r.serviceTeam.name, [])
    for (const g of r.memberGrades) {
      if (g.averageScore != null) allTeamMap.get(r.serviceTeam.name)!.push(g.averageScore)
    }
  }
  const top5Teams = [...allTeamMap.entries()]
    .map(([name, scores]: [string, number[]]) => ({ name, avg: scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0 }))
    .sort((a: TeamAverage, b: TeamAverage) => b.avg - a.avg)
    .slice(0, 5)
    .map((t: TeamAverage) => t.name)

  const trendData: TrendPoint[] = months12.map((m: MonthPoint) => {
    const point: TrendPoint = { label: m.label }
    for (const teamName of top5Teams) {
      const scores = trendReports
        .filter((r: TrendReport) => r.reportMonth === m.month && r.reportYear === m.year && r.serviceTeam.name === teamName)
        .flatMap((r: TrendReport) => r.memberGrades.map((g: TrendMemberGrade) => g.averageScore).filter((s: unknown): s is number => s != null))
      point[teamName] = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null
    }
    return point
  })

  // Top members
  const memberIds = topMemberGroups.map((g: TopMemberGroup) => g.memberId)
  const memberDetails = await prisma.serviceTeamMember.findMany({
    where: { id: { in: memberIds } },
    include: { teamAssignments: { take: 1, include: { team: { select: { name: true } } } } },
  })
  const memberMap = new Map<string, MemberDetail>()
  for (const member of memberDetails as MemberDetail[]) {
    memberMap.set(member.id, member)
  }
  const topMembers: MemberRow[] = topMemberGroups
    .filter((g: TopMemberGroup) => g._avg.averageScore != null)
    .map((g: TopMemberGroup, i: number) => {
      const m = memberMap.get(g.memberId)
      return {
        rank: i + 1,
        name: m?.fullName ?? '—',
        team: m?.teamAssignments[0]?.team.name ?? '—',
        avgScore: g._avg.averageScore!,
        reportsCount: g._count.id,
      }
    })

  // Pastor grouped bar — teams by pastor, avg score current month
  const allPastorTeams = [...new Set(
    pastors.flatMap((p: PastorSource) => p.serviceTeams.map((t: PastorTeam) => t.name))
  )]
  const pastorGroupData: PastorBarEntry[] = pastors
    .filter((p: PastorSource) => p.serviceTeams.length > 0)
    .map((p: PastorSource) => {
      const entry: PastorBarEntry = {
        pastorName: p.pastorName,
        displayName: p.pastorName.split(' ')[0],
      }
      for (const team of p.serviceTeams as PastorTeam[]) {
        const teamData = teamScoreMap.get(team.name)
        const scores = teamData?.scores ?? []
        entry[team.name] = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null
      }
      // Fill null for teams not belonging to this pastor
      for (const teamName of allPastorTeams) {
        if (!(teamName in entry)) entry[teamName] = null
      }
      return entry
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
    statusDistribution: statusGroups.map((g: StatusGroup) => ({ status: g.status as string, count: g._count.id })),
    trendData,
    trendTeams: top5Teams,
    topMembers,
    pastorGroupData,
    pastorTeams: allPastorTeams,
  }
}

export default async function HeadAnalyticsPage() {
  const session = await auth()
  const roles = session?.user?.roles ?? []
  if (!roles.includes('HEAD_OF_SUPERVISOR') && !roles.includes('PASTOR')) redirect('/dashboard')

  const data = await getData()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-sbc-black dark:text-white tracking-widest">
          ANALYTICS
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Full system performance overview</p>
      </div>
      <HeadAnalyticsClient {...data} />
    </div>
  )
}
