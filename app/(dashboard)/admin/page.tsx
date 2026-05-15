import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Users, FileText, UserCheck, ClipboardList } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

async function getData() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  try {
    const [teamCount, reportCount, memberCount, pendingCount, submissions, activities] =
      await Promise.all([
        prisma.serviceTeam.count({ where: { isActive: true } }),
        prisma.hodReport.count({ where: { reportMonth: month, reportYear: year } }),
        prisma.serviceTeamMember.count({ where: { isActive: true } }),
        prisma.hodReport.count({ where: { status: 'SUBMITTED' } }),
        prisma.hodReport.findMany({
          take: 15,
          orderBy: { createdAt: 'desc' },
          include: {
            hodProfile: { select: { hodName: true } },
            serviceTeam: { select: { name: true } },
          },
        }),
        prisma.activityLog.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true, lastName: true } } },
        }),
      ])
    return { teamCount, reportCount, memberCount, pendingCount, submissions, activities, month, year }
  } catch {
    return {
      teamCount: 0, reportCount: 0, memberCount: 0, pendingCount: 0,
      submissions: [], activities: [], month, year,
    }
  }
}

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) redirect('/dashboard')

  const { teamCount, reportCount, memberCount, pendingCount, submissions, activities, month, year } =
    await getData()

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Service Teams" value={teamCount} subtitle="Active teams" color="red" icon={<Users size={36} />} />
        <StatCard label="Reports This Month" value={reportCount} subtitle={`${MONTHS[month - 1]} ${year}`} color="amber" icon={<FileText size={36} />} />
        <StatCard label="Members Enrolled" value={memberCount} subtitle="Active members" color="green" icon={<UserCheck size={36} />} />
        <StatCard label="Reviews Pending" value={pendingCount} subtitle="Awaiting pastor review" color="blue" icon={<ClipboardList size={36} />} />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Submissions table */}
        <div className="xl:col-span-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-sbc-grey dark:border-white/10">
            <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">
              SUBMISSIONS
            </h2>
            <div className="flex gap-2">
              <select defaultValue={month} className="text-xs bg-sbc-grey dark:bg-zinc-700 border-0 rounded px-2 py-1.5 text-sbc-black dark:text-white outline-none">
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select defaultValue={year} className="text-xs bg-sbc-grey dark:bg-zinc-700 border-0 rounded px-2 py-1.5 text-sbc-black dark:text-white outline-none">
                {Array.from({ length: 10 }, (_, i) => 2026 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sbc-grey dark:border-white/10">
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Team</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">HOD</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Date</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">
                      No submissions yet
                    </td>
                  </tr>
                ) : (
                  submissions.map((r) => (
                    <tr key={r.id} className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-sbc-black dark:text-white font-medium">{r.serviceTeam.name}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{r.hodProfile.hodName}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-500 text-xs">
                        {r.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Activity feed */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
            <div className="px-5 py-4 border-b border-sbc-grey dark:border-white/10">
              <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">ACTIVITY</h2>
            </div>
            <div className="divide-y divide-sbc-grey/50 dark:divide-white/5">
              {activities.length === 0 ? (
                <p className="px-5 py-6 text-gray-400 text-sm text-center">No recent activity</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <p className="text-sm text-sbc-black dark:text-white font-medium leading-tight">{a.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 line-clamp-1">{a.description}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {a.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      {a.user ? ` · ${a.user.firstName} ${a.user.lastName ?? ''}` : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Score trend placeholder */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-5">
            <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest mb-4">SCORE TREND</h2>
            <div className="flex items-end gap-1 h-20">
              {[65, 72, 68, 80, 75, 88, 82].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-sbc-red/80 dark:bg-sbc-red/60 transition-all"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
              {['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
