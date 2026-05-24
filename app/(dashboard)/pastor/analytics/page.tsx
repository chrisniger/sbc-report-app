import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import PastorAnalyticsClient from '@/components/analytics/PastorAnalyticsClient'
import type { TeamScorePoint } from '@/components/charts/TeamScoreBar'
import type { TrendPoint } from '@/components/charts/ScoreTrendChart'
import type { MemberRow } from '@/components/charts/MemberScoreTable'
import { getSupervisedPastorScope } from '@/lib/pastor-scope'

// ── Explicit result types ──
interface TrendReport {
  reportMonth: number
  reportYear: number
  serviceTeam: { name: string }
  memberGrades: TrendMemberGrade[]
}
interface TrendMemberGrade { averageScore: number | null }
interface TopMemberGroup { memberId: string; _avg: { averageScore: number | null }; _count: { id: number } }
interface StatusGroup { status: string; _count: { id: number } }
interface MonthPoint { month: number; year: number; label: string }

type MemberDetail = {
  id: string
  fullName: string
  teamAssignments: { team: { name: string } }[]
}

function build6Months(): MonthPoint[] {
  const now = new Date()
  return Array.from({ length: 6 }, (_: unknown, i: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    }
  })
}

async function getData(userId: string) {
  const months6 = build6Months()

  const scope = await getSupervisedPastorScope(userId)
  if (!scope) return null

  const { hodIds, teamIds } = scope
  const reportWhere = {
    hodProfileId: { in: hodIds },
    serviceTeamId: { in: teamIds },
  }
  const submittedReportWhere = {
    ...reportWhere,
    status: { not: 'DRAFT' as const },
  }
  const teams = await prisma.serviceTeam.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  const teamNames = teams.map((t: { id: string; name: string }) => t.name)

  const [statusGroups, submittedCount, submittedAvg, pendingReviews, submittedReports, trendReports, topMemberGroups] =
    await Promise.all([
      prisma.hodReport.groupBy({
        by: ['status'],
        _count: { id: true },
        where: submittedReportWhere,
      }),
      prisma.hodReport.count({
        where: submittedReportWhere,
      }),
      prisma.reportMemberGrade.aggregate({
        where: {
          report: submittedReportWhere,
          averageScore: { not: null },
        },
        _avg: { averageScore: true },
      }),
      prisma.hodReport.count({
        where: { ...reportWhere, status: 'SUBMITTED' },
      }),
      prisma.hodReport.findMany({
        where: submittedReportWhere,
        include: {
          serviceTeam: { select: { name: true } },
          memberGrades: { select: { averageScore: true } },
        },
      }),
      prisma.hodReport.findMany({
        where: {
          ...reportWhere,
          OR: months6.map((m: MonthPoint) => ({ reportMonth: m.month, reportYear: m.year })),
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
          report: { ...reportWhere, status: { not: 'DRAFT' } },
          averageScore: { not: null },
        },
        orderBy: { _avg: { averageScore: 'desc' } },
        take: 10,
      }),
    ])

  // Assert types from Promise.all
  const typedTrendReports = trendReports as TrendReport[]
  const typedTopMemberGroups = topMemberGroups as TopMemberGroup[]
  const typedStatusGroups = statusGroups as StatusGroup[]

  // Team scores across all non-draft submitted reports in this pastor's HOST scope.
  const teamScoreMap = new Map<string, { scores: number[] }>()
  for (const r of submittedReports as TrendReport[]) {
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

  // Teams for trend — all pastor's teams
  const trendData: TrendPoint[] = months6.map((m: MonthPoint) => {
    const point: TrendPoint = { label: m.label }
    for (const teamName of teamNames) {
      const scores = typedTrendReports
        .filter((r: TrendReport) => r.reportMonth === m.month && r.reportYear === m.year && r.serviceTeam.name === teamName)
        .flatMap((r: TrendReport) => r.memberGrades.map((g: TrendMemberGrade) => g.averageScore).filter((s: unknown): s is number => s != null))
      point[teamName] = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null
    }
    return point
  })

  // Top members
  const memberIds = typedTopMemberGroups.map((g: TopMemberGroup) => g.memberId)
  const memberDetails = await prisma.serviceTeamMember.findMany({
    where: { id: { in: memberIds } },
    include: { teamAssignments: { take: 1, include: { team: { select: { name: true } } } } },
  })
  const memberMap = new Map<string, MemberDetail>()
  for (const member of memberDetails as MemberDetail[]) {
    memberMap.set(member.id, member)
  }
  const topMembers: MemberRow[] = typedTopMemberGroups
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

  return {
    stats: {
      myTeamsCount: teamIds.length,
      submittedReports: submittedCount,
      averageScore: submittedAvg._avg.averageScore ?? null,
      pendingReviews,
    },
    teamScores,
    statusDistribution: typedStatusGroups.map((g: StatusGroup) => ({ status: g.status as string, count: g._count.id })),
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
