import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import HodAnalyticsClient from '@/components/analytics/HodAnalyticsClient'
import type { TeamScorePoint } from '@/components/charts/TeamScoreBar'
import type { TrendPoint } from '@/components/charts/ScoreTrendChart'
import type { HodMemberGradeRow } from '@/components/analytics/HodAnalyticsClient'

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

async function getData(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const months12 = build12Months()

  const hodProfile = await prisma.hodProfile.findUnique({
    where: { userId },
    include: { serviceTeams: { select: { id: true, name: true } } },
  })
  if (!hodProfile) return null

  type HodTeam = (typeof hodProfile.serviceTeams)[number]
  const teamIds = hodProfile.serviceTeams.map((t: HodTeam) => t.id)

  const [totalMembers, submittedThisYear, allReports] = await Promise.all([
    prisma.serviceTeamMember.count({
      where: {
        teamAssignments: { some: { teamId: { in: teamIds } } },
        isActive: true,
      },
    }),
    prisma.hodReport.count({
      where: { hodProfileId: hodProfile.id, reportYear: year, status: { not: 'DRAFT' } },
    }),
    prisma.hodReport.findMany({
      where: {
        hodProfileId: hodProfile.id,
        OR: months12.map((m: (typeof months12)[number]) => ({ reportMonth: m.month, reportYear: m.year })),
        status: { not: 'DRAFT' },
      },
      orderBy: [{ reportYear: 'desc' }, { reportMonth: 'desc' }],
      include: {
        serviceTeam: { select: { id: true, name: true } },
        memberGrades: {
          include: { member: { select: { id: true, fullName: true } } },
        },
      },
    }),
  ])

  type ReportSource = (typeof allReports)[number]
  type GradeSource = ReportSource['memberGrades'][number]
  type MonthPoint = (typeof months12)[number]
  type MemberBarEntry = { fullName: string; scores: number[] }

  // Best score and latest avg
  const reportAvgs = allReports.map((r: ReportSource) => {
    const scores = r.memberGrades.map((g: GradeSource) => g.averageScore).filter((s: unknown): s is number => s != null)
    return scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null
  }).filter((s: unknown): s is number => s != null)

  const bestScore = reportAvgs.length ? Math.max(...reportAvgs) : null
  const latestAvgScore = reportAvgs.length ? reportAvgs[0] : null

  // Member bar data — current month reports
  const currentMonthReports = allReports.filter((r: ReportSource) => r.reportMonth === month && r.reportYear === year)
  const memberBarMap = new Map<string, { fullName: string; scores: number[] }>()
  for (const r of currentMonthReports) {
    for (const g of r.memberGrades) {
      const key = g.member.id
      if (!memberBarMap.has(key)) memberBarMap.set(key, { fullName: g.member.fullName, scores: [] })
      if (g.averageScore != null) memberBarMap.get(key)!.scores.push(g.averageScore)
    }
  }
  const memberBarData: TeamScorePoint[] = [...memberBarMap.values()]
    .map(({ fullName, scores }: MemberBarEntry) => ({
      name: fullName,
      displayName: fullName.length > 12 ? fullName.split(' ')[0] : fullName,
      avgScore: scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0,
      membersGraded: scores.length,
    }))
    .filter((m: TeamScorePoint) => m.membersGraded > 0)
    .sort((a: TeamScorePoint, b: TeamScorePoint) => b.avgScore - a.avgScore)

  // Trend data — one line per service team
  const teamNames = hodProfile.serviceTeams.map((t: HodTeam) => t.name)
  const trendData: TrendPoint[] = months12.map((m: MonthPoint) => {
    const point: TrendPoint = { label: m.label }
    for (const team of hodProfile.serviceTeams) {
      const report = allReports.find(
        (r: ReportSource) => r.reportMonth === m.month && r.reportYear === m.year && r.serviceTeam.id === team.id
      )
      if (report) {
        const scores = report.memberGrades.map((g: GradeSource) => g.averageScore).filter((s: unknown): s is number => s != null)
        point[team.name] = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null
      } else {
        point[team.name] = null
      }
    }
    return point
  })

  // Grade table — most recent report's member grades
  const latestReport = allReports[0]
  const gradeRows: HodMemberGradeRow[] = latestReport
    ? latestReport.memberGrades.map((g: GradeSource) => ({
        memberId: g.member.id,
        memberName: g.member.fullName,
        teamName: latestReport.serviceTeam.name,
        generalAttitude: g.generalAttitude as string,
        teamwork: g.teamwork as string,
        punctuality: g.punctuality as string,
        appearance: g.appearance as string,
        attendance: g.attendance as string,
        avgScore: g.averageScore,
      }))
    : []

  return {
    stats: { totalMembers, submittedThisYear, bestScore, latestAvgScore },
    memberBarData,
    trendData,
    trendTeams: teamNames,
    gradeRows,
  }
}

export default async function HodAnalyticsPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('HOD')) redirect('/dashboard')

  const data = await getData(session.user.id)
  if (!data) redirect('/login')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-sbc-black dark:text-white tracking-widest">
          ANALYTICS
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Your team performance overview</p>
      </div>
      <HodAnalyticsClient {...data} />
    </div>
  )
}
