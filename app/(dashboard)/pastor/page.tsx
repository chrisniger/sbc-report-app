import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import Link from 'next/link'
import { Users, FileText, ClipboardCheck, CheckSquare } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { getSupervisedPastorScope } from '@/lib/pastor-scope'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function build12Months() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    }
  })
}

const GRADE_LABEL: Record<string, string> = {
  FIVE: '5', FOUR: '4', THREE: '3', TWO: '2', ONE: '1', NOT_APPLICABLE: 'N/A',
}

const GRADE_CLS: Record<string, string> = {
  FIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  FOUR: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  THREE: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  TWO: 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400',
  ONE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500',
  NOT_APPLICABLE: 'bg-gray-50 text-gray-400 dark:bg-zinc-900 dark:text-gray-500',
}

type MemberGradeRow = {
  reportId: string
  memberId: string
  memberName: string
  teamName: string
  generalAttitude: string
  teamwork: string
  punctuality: string
  appearance: string
  attendance: string
  avgScore: number | null
}

interface SearchParams {
  month?: string
  team?: string
}

async function getData(userId: string, filters: { month?: number; teamId?: string }) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const months12 = build12Months()

  try {
    const scope = await getSupervisedPastorScope(userId)
    if (!scope) return null

    const { pastorProfile, hodIds, teamIds } = scope
    const pastorId = pastorProfile.id
    const filterTeamId = filters.teamId && teamIds.includes(filters.teamId)
      ? filters.teamId
      : undefined
    const reportWhere: Prisma.HodReportWhereInput = {
      hodProfileId: { in: hodIds },
      serviceTeamId: { in: teamIds },
    }
    const submittedReportWhere: Prisma.HodReportWhereInput = {
      ...reportWhere,
      status: { not: 'DRAFT' },
    }
    const filteredSubmittedReportWhere: Prisma.HodReportWhereInput = {
      ...submittedReportWhere,
      serviceTeamId: filterTeamId ?? { in: teamIds },
      ...(filters.month ? { reportMonth: filters.month } : {}),
    }
    const filteredLatestReportWhere: Prisma.HodReportWhereInput = {
      ...filteredSubmittedReportWhere,
      ...(filters.month ? {} : { OR: months12.map(m => ({ reportMonth: m.month, reportYear: m.year })) }),
    }

    const [teamCount, submittedCount, reviewsPending, reviewsDone, reports, latestReport, teams] =
      await Promise.all([
        Promise.resolve(teamIds.length),
        prisma.hodReport.count({ where: submittedReportWhere }),
        prisma.hodReport.count({ where: { ...reportWhere, status: 'SUBMITTED' } }),
        prisma.pastorReview.count({ where: { pastorId } }),
        prisma.hodReport.findMany({
          where: filteredSubmittedReportWhere,
          take: 12,
          orderBy: { createdAt: 'desc' },
          include: {
            hodProfile: { select: { hodName: true } },
            serviceTeam: { select: { name: true } },
          },
        }),
        prisma.hodReport.findFirst({
          where: filteredLatestReportWhere,
          orderBy: [{ reportYear: 'desc' }, { reportMonth: 'desc' }, { updatedAt: 'desc' }],
          include: {
            serviceTeam: { select: { name: true } },
            memberGrades: {
              include: { member: { select: { id: true, fullName: true } } },
            },
          },
        }),
        prisma.serviceTeam.findMany({
          where: { id: { in: teamIds } },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        }),
      ])

    const gradeRows: MemberGradeRow[] = latestReport
      ? latestReport.memberGrades.map(g => ({
          reportId: latestReport.id,
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
      teamCount,
      submittedCount,
      reviewsPending,
      reviewsDone,
      reports,
      gradeRows,
      teams,
      selectedMonth: filters.month,
      selectedTeamId: filterTeamId,
      month,
      year,
    }
  } catch {
    return null
  }
}

function GradeCell({ grade }: { grade: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-6 rounded text-[11px] font-medium ${GRADE_CLS[grade] ?? GRADE_CLS.NOT_APPLICABLE}`}
    >
      {GRADE_LABEL[grade] ?? grade}
    </span>
  )
}

export default async function PastorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user?.roles?.includes('SUPERVISOR_PASTOR')) redirect('/dashboard')

  const params = await searchParams
  const selectedMonth = params.month ? parseInt(params.month) : undefined
  const data = await getData(session.user.id, {
    month: selectedMonth && selectedMonth >= 1 && selectedMonth <= 12 ? selectedMonth : undefined,
    teamId: params.team,
  })
  if (!data) redirect('/login')

  const { teamCount, submittedCount, reviewsPending, reviewsDone, reports, gradeRows, teams, selectedTeamId } = data
  const filterActive = Boolean(data.selectedMonth || selectedTeamId)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="My Teams" value={teamCount} subtitle="Team(s)" color="red" icon={<Users size={36} />} href="/pastor/teams" />
        <StatCard label="Reports Submitted" value={submittedCount} subtitle="View" color="green" icon={<FileText size={36} />} href="/pastor/reports" />
        <StatCard label="Reviews Pending" value={reviewsPending} subtitle="Review" color="amber" icon={<ClipboardCheck size={36} />} href="/pastor/reports" />
        <StatCard label="Reviews Done" value={reviewsDone} subtitle="Completed by me" color="blue" icon={<CheckSquare size={36} />} />
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-[20px] dark:rounded-lg border border-[#edf0f5] shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-4 border-b border-[#edf0f5] dark:border-white/10">
          <h2 className="font-heading text-[#0f172a] dark:text-white text-xl tracking-widest">TEAM REPORTS</h2>
          <form className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#475569] dark:text-gray-400 mb-1 font-medium">
                Team
              </label>
              <select
                name="team"
                defaultValue={selectedTeamId ?? ''}
                className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-700 border border-[#dfe4ec] dark:border-white/10 rounded text-[#111827] dark:text-white shadow-sm focus:outline-none focus:border-sbc-red"
              >
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#475569] dark:text-gray-400 mb-1 font-medium">
                Month
              </label>
              <select
                name="month"
                defaultValue={data.selectedMonth ?? ''}
                className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-700 border border-[#dfe4ec] dark:border-white/10 rounded text-[#111827] dark:text-white shadow-sm focus:outline-none focus:border-sbc-red"
              >
                <option value="">All months</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-sbc-red text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              Filter
            </button>
            {filterActive && (
              <Link
                href="/pastor"
                className="px-3 py-1.5 border border-[#dfe4ec] dark:border-white/10 text-xs text-[#475569] dark:text-gray-400 rounded hover:bg-[#fff7f8] dark:hover:bg-white/5 transition-colors"
              >
                Clear
              </Link>
            )}
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#edf0f5] bg-[#f8fafc] dark:border-white/10 dark:bg-transparent">
                <th className="text-left px-5 py-3 text-[#475569] dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">Team</th>
                <th className="text-left px-5 py-3 text-[#475569] dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">HOSTs</th>
                <th className="text-left px-5 py-3 text-[#475569] dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">Period</th>
                <th className="text-left px-5 py-3 text-[#475569] dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">Status</th>
                <th className="text-left px-5 py-3 text-[#475569] dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[#94a3b8] text-sm">
                    No reports from your teams{filterActive ? ' for this filter' : ''} yet
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="border-b border-[#edf0f5] dark:border-white/5 hover:bg-[#fff7f8] dark:hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-[#111827] dark:text-white font-semibold">{r.serviceTeam.name}</td>
                    <td className="px-5 py-3 text-[#475569] dark:text-gray-400">{r.hodProfile.hodName}</td>
                    <td className="px-5 py-3 text-[#475569] text-xs">{MONTHS[r.reportMonth - 1]} {r.reportYear}</td>
                    <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/pastor/reports/${r.id}`}
                        className="inline-flex items-center rounded bg-sbc-red px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-[20px] dark:rounded-lg border border-[#edf0f5] shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-4 border-b border-[#edf0f5] dark:border-white/10">
          <h2 className="font-heading text-[#0f172a] dark:text-white text-xl tracking-widest">
            MEMBER PERFORMANCE
          </h2>
          <form className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#475569] dark:text-gray-400 mb-1 font-medium">
                Team
              </label>
              <select
                name="team"
                defaultValue={selectedTeamId ?? ''}
                className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-700 border border-[#dfe4ec] dark:border-white/10 rounded text-[#111827] dark:text-white shadow-sm focus:outline-none focus:border-sbc-red"
              >
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#475569] dark:text-gray-400 mb-1 font-medium">
                Month
              </label>
              <select
                name="month"
                defaultValue={data.selectedMonth ?? ''}
                className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-700 border border-[#dfe4ec] dark:border-white/10 rounded text-[#111827] dark:text-white shadow-sm focus:outline-none focus:border-sbc-red"
              >
                <option value="">All months</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-sbc-red text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              Filter
            </button>
            {filterActive && (
              <Link
                href="/pastor"
                className="px-3 py-1.5 border border-[#dfe4ec] dark:border-white/10 text-xs text-[#475569] dark:text-gray-400 rounded hover:bg-[#fff7f8] dark:hover:bg-white/5 transition-colors"
              >
                Clear
              </Link>
            )}
          </form>
        </div>
        {gradeRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-[#94a3b8] text-sm">
            No grade data available{filterActive ? ' for this filter' : ''}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#f8fafc] dark:bg-zinc-900/60 border-b border-[#edf0f5] dark:border-white/10">
                  {['Name', 'Team', 'Gen. Attitude', 'Teamwork', 'Punctuality', 'Appearance', 'Attendance', 'Avg'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[#475569] dark:text-gray-400 uppercase tracking-wider font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradeRows.map(row => (
                  <tr key={`${row.reportId}-${row.memberId}`} className="border-b border-[#edf0f5] dark:border-white/5 hover:bg-[#fff7f8] dark:hover:bg-white/5">
                    <td className="px-3 py-2 font-semibold text-[#111827] dark:text-white whitespace-nowrap">{row.memberName}</td>
                    <td className="px-3 py-2 text-[#475569] whitespace-nowrap">{row.teamName}</td>
                    <td className="px-3 py-2"><GradeCell grade={row.generalAttitude} /></td>
                    <td className="px-3 py-2"><GradeCell grade={row.teamwork} /></td>
                    <td className="px-3 py-2"><GradeCell grade={row.punctuality} /></td>
                    <td className="px-3 py-2"><GradeCell grade={row.appearance} /></td>
                    <td className="px-3 py-2"><GradeCell grade={row.attendance} /></td>
                    <td className="px-3 py-2 font-medium text-[#111827] dark:text-white">
                      {row.avgScore != null ? row.avgScore.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
