import { auth } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { Users, FileText, Clock, CheckSquare } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface SearchParams {
  team?: string
  month?: string
  year?: string
}

async function getData(userId: string, filters: SearchParams) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const selectedMonth = filters.month ? Number(filters.month) : null
  const selectedYear = filters.year ? Number(filters.year) : null
  const selectedTeamId = filters.team || null
  const submissionsWhere: Prisma.HodReportWhereInput = {
    ...(selectedTeamId ? { serviceTeamId: selectedTeamId } : {}),
    ...(selectedMonth ? { reportMonth: selectedMonth } : {}),
    ...(selectedYear ? { reportYear: selectedYear } : {}),
  }

  try {
    const [teamCount, reportsIn, awaitingReview, reviewedByMe, teams, submissions] =
      await Promise.all([
        prisma.serviceTeam.count({ where: { isActive: true } }),
        prisma.hodReport.count({ where: { status: { not: 'DRAFT' } } }),
        prisma.hodReport.count({
          where: {
            pastorReview: { is: { submittedAt: { not: null } } },
            OR: [
              { headReview: null },
              { headReview: { is: { submittedAt: null } } },
            ],
          },
        }),
        prisma.headReview.count({ where: { reviewedById: userId } }),
        prisma.serviceTeam.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        prisma.hodReport.findMany({
          where: submissionsWhere,
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            hodProfile: { select: { hodName: true } },
            serviceTeam: { select: { name: true } },
          },
        }),
      ])

    return { teamCount, reportsIn, awaitingReview, reviewedByMe, teams, submissions, month, year, selectedMonth, selectedYear, selectedTeamId }
  } catch {
    return null
  }
}

export default async function HeadDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user) redirect('/dashboard')
  const roles = session?.user?.roles ?? []
  if (!roles.includes('HEAD_OF_SUPERVISOR') && !roles.includes('PASTOR')) redirect('/dashboard')

  const filters = (await searchParams) ?? {}
  const data = await getData(session.user.id, filters)
  if (!data) redirect('/login')

  const { teamCount, reportsIn, awaitingReview, reviewedByMe, teams, submissions, year, selectedMonth, selectedYear, selectedTeamId } = data
  const filterActive = Boolean(selectedTeamId || selectedMonth || selectedYear)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="All Teams" value={teamCount} subtitle="System-wide" color="red" icon={<Users size={36} />} />
        <StatCard label="Reports In" value={reportsIn} subtitle="Submitted reports" color="green" icon={<FileText size={36} />} />
        <StatCard label="Awaiting Review" value={awaitingReview} subtitle="Sup. Pastor reviewed" color="amber" icon={<Clock size={36} />} />
        <StatCard label="Reviewed by Me" value={reviewedByMe} subtitle="Committee reviews done" color="blue" icon={<CheckSquare size={36} />} />
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-4 border-b border-sbc-grey dark:border-white/10">
          <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">ALL SUBMISSIONS</h2>
          <form className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">
                Team
              </label>
              <select
                name="team"
                defaultValue={selectedTeamId ?? ''}
                className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red"
              >
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">
                Month
              </label>
              <select
                name="month"
                defaultValue={selectedMonth ?? ''}
                className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red"
              >
                <option value="">All months</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">
                Year
              </label>
              <select
                name="year"
                defaultValue={selectedYear ?? ''}
                className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red"
              >
                <option value="">All years</option>
                {[year - 1, year, year + 1, year + 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
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
                href="/head"
                className="px-3 py-1.5 border border-sbc-grey dark:border-white/10 text-xs text-gray-500 dark:text-gray-400 rounded hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
              >
                Clear
              </Link>
            )}
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sbc-grey dark:border-white/10">
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Team</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">HOSTs</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Period</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Status</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                    No submissions{filterActive ? ' for this filter' : ''} yet
                  </td>
                </tr>
              ) : (
                submissions.map((r) => (
                  <tr key={r.id} className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-sbc-black dark:text-white font-medium">{r.serviceTeam.name}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{r.hodProfile.hodName}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{MONTHS[r.reportMonth - 1]} {r.reportYear}</td>
                    <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/head/reports/${r.id}`}
                        className="inline-flex items-center justify-center rounded bg-sbc-red px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
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
    </div>
  )
}
