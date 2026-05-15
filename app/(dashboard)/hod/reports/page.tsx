import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i)

interface SearchParams {
  month?: string
  year?: string
}

export default async function HodReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user?.roles?.includes('HOD')) redirect('/dashboard')

  const params = await searchParams
  const filterMonth = params.month ? parseInt(params.month) : undefined
  const filterYear = params.year ? parseInt(params.year) : undefined

  const hodProfile = await prisma.hodProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!hodProfile) redirect('/dashboard')

  const where: Record<string, unknown> = { hodProfileId: hodProfile.id }
  if (filterMonth) where.reportMonth = filterMonth
  if (filterYear) where.reportYear = filterYear

  const reports = await prisma.hodReport.findMany({
    where,
    orderBy: [{ reportYear: 'desc' }, { reportMonth: 'desc' }],
    include: {
      serviceTeam: { select: { name: true } },
      memberGrades: { select: { averageScore: true } },
    },
  })

  function teamAvg(grades: { averageScore: number | null }[]): string {
    const vals = grades
      .map((g) => g.averageScore)
      .filter((v): v is number => v !== null)
    if (vals.length === 0) return '—'
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm px-5 py-4">
        <form className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">
              Month
            </label>
            <select
              name="month"
              defaultValue={filterMonth ?? ''}
              className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red"
            >
              <option value="">All months</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">
              Year
            </label>
            <select
              name="year"
              defaultValue={filterYear ?? ''}
              className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red"
            >
              <option value="">All years</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-sbc-red text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            Filter
          </button>
          {(filterMonth || filterYear) && (
            <Link
              href="/hod/reports"
              className="px-4 py-1.5 border border-sbc-grey dark:border-white/10 text-sm text-gray-500 dark:text-gray-400 rounded hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Team</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Period</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium hidden md:table-cell">
                  Enrolled
                </th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium hidden md:table-cell">
                  Present
                </th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium hidden lg:table-cell">
                  Avg Score
                </th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Status</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm">
                    No reports found{filterMonth || filterYear ? ' for this filter' : ''}.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-5 py-3 text-sbc-black dark:text-white font-medium">
                      {r.serviceTeam.name}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {MONTHS[r.reportMonth - 1]} {r.reportYear}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-500 hidden md:table-cell">
                      {r.totalMembersEnrolled}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-500 hidden md:table-cell">
                      {r.totalMembersPresent ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-center hidden lg:table-cell">
                      <span
                        className={`text-xs font-bold ${
                          r.memberGrades.length === 0
                            ? 'text-gray-400'
                            : parseFloat(teamAvg(r.memberGrades)) >= 4
                            ? 'text-green-600 dark:text-green-400'
                            : parseFloat(teamAvg(r.memberGrades)) >= 3
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-sbc-red'
                        }`}
                      >
                        {teamAvg(r.memberGrades)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {r.status === 'DRAFT' && (
                          <Link
                            href="/hod/report"
                            className="text-xs text-sbc-red hover:underline font-medium"
                          >
                            Edit
                          </Link>
                        )}
                        {r.status !== 'DRAFT' && (
                          <Link
                            href={`/hod/reports/${r.id}`}
                            className="text-xs text-sbc-red hover:underline font-medium"
                          >
                            View
                          </Link>
                        )}
                        {r.status === 'DRAFT' && (
                          <span className="text-xs text-gray-400">Draft</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {reports.length} report{reports.length !== 1 ? 's' : ''} found
      </p>
    </div>
  )
}
