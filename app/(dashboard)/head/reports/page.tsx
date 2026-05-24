import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i)

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'PASTOR_REVIEWED', label: 'Supervising Pastor Reviewed' },
  { value: 'HEAD_REVIEWED', label: 'Committee Reviewed' },
  { value: 'COMPLETED', label: 'Completed' },
]

interface SearchParams { month?: string; year?: string; status?: string }

export default async function HeadReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  const roles = session?.user?.roles ?? []
  if (!roles.includes('HEAD_OF_SUPERVISOR') && !roles.includes('PASTOR')) redirect('/dashboard')

  const params = await searchParams
  const filterMonth = params.month ? parseInt(params.month) : undefined
  const filterYear = params.year ? parseInt(params.year) : undefined
  const filterStatus = params.status || undefined

  const reports = await prisma.hodReport.findMany({
    where: {
      ...(filterMonth ? { reportMonth: filterMonth } : {}),
      ...(filterYear ? { reportYear: filterYear } : {}),
      ...(filterStatus ? { status: filterStatus as never } : { status: { not: 'DRAFT' } }),
    },
    orderBy: [{ reportYear: 'desc' }, { reportMonth: 'desc' }],
    include: {
      serviceTeam: { select: { name: true } },
      hodProfile: { select: { hodName: true } },
      pastorReview: { select: { id: true, submittedAt: true } },
      memberGrades: { select: { averageScore: true } },
    },
  })

  function teamAvg(grades: { averageScore: number | null }[]): string {
    const vals = grades.map((g) => g.averageScore).filter((v): v is number => v !== null)
    if (vals.length === 0) return '—'
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  const hasFilter = !!(filterMonth || filterYear || filterStatus)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm px-5 py-4">
        <form className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">
              Status
            </label>
            <select
              name="status"
              defaultValue={filterStatus ?? ''}
              className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
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
          {hasFilter && (
            <Link
              href="/head/reports"
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
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">HOSTs</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Period</th>
                <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium hidden md:table-cell">
                  Avg Score
                </th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium hidden lg:table-cell">
                  Pastor Review
                </th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm">
                    No reports found{hasFilter ? ' for this filter' : ''}.
                  </td>
                </tr>
              ) : (
                reports.map((r) => {
                  const avg = teamAvg(r.memberGrades)
                  const avgNum = avg !== '—' ? parseFloat(avg) : null
                  const pastorDone = !!r.pastorReview?.submittedAt
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-5 py-3 text-sbc-black dark:text-white font-medium">
                        {r.serviceTeam.name}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                        {r.hodProfile.hodName}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                        {MONTHS[r.reportMonth - 1]} {r.reportYear}
                      </td>
                      <td className="px-5 py-3 text-center hidden md:table-cell">
                        <span className={`text-xs font-bold ${
                          avgNum === null ? 'text-gray-400'
                          : avgNum >= 4 ? 'text-green-600 dark:text-green-400'
                          : avgNum >= 3 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-sbc-red'
                        }`}>
                          {avg}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        {pastorDone ? (
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ Done</span>
                        ) : r.pastorReview ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400">Draft</span>
                        ) : (
                          <span className="text-xs text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/head/reports/${r.id}`}
                          className="text-xs text-sbc-red hover:underline font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })
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
