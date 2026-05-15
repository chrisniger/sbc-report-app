import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Users, FileText, ClipboardCheck, CheckSquare } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

async function getData(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  try {
    const pastorProfile = await prisma.pastorProfile.findUnique({
      where: { userId },
      include: { serviceTeams: { select: { id: true } } },
    })
    if (!pastorProfile) return null

    const pastorId = pastorProfile.id
    const teamIds = pastorProfile.serviceTeams.map((t) => t.id)

    const [teamCount, submittedCount, reviewsPending, reviewsDone, reports, activities] =
      await Promise.all([
        Promise.resolve(teamIds.length),
        prisma.hodReport.count({ where: { serviceTeamId: { in: teamIds } } }),
        prisma.hodReport.count({ where: { serviceTeamId: { in: teamIds }, status: 'SUBMITTED' } }),
        prisma.pastorReview.count({ where: { pastorId } }),
        prisma.hodReport.findMany({
          where: { serviceTeamId: { in: teamIds } },
          take: 12,
          orderBy: { createdAt: 'desc' },
          include: {
            hodProfile: { select: { hodName: true } },
            serviceTeam: { select: { name: true } },
          },
        }),
        prisma.activityLog.findMany({
          where: {
            entityType: 'HodReport',
            entityId: { in: (await prisma.hodReport.findMany({ where: { serviceTeamId: { in: teamIds } }, select: { id: true } })).map(r => r.id) },
          },
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true, lastName: true } } },
        }),
      ])

    return { teamCount, submittedCount, reviewsPending, reviewsDone, reports, activities, month, year }
  } catch {
    return null
  }
}

export default async function PastorDashboardPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('SUPERVISOR_PASTOR')) redirect('/dashboard')

  const data = await getData(session.user.id)
  if (!data) redirect('/login')

  const { teamCount, submittedCount, reviewsPending, reviewsDone, reports, activities } = data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="My Teams" value={teamCount} subtitle="Assigned teams" color="red" icon={<Users size={36} />} />
        <StatCard label="Reports Submitted" value={submittedCount} subtitle="From my teams" color="green" icon={<FileText size={36} />} />
        <StatCard label="Reviews Pending" value={reviewsPending} subtitle="Awaiting my review" color="amber" icon={<ClipboardCheck size={36} />} />
        <StatCard label="Reviews Done" value={reviewsDone} subtitle="Completed by me" color="blue" icon={<CheckSquare size={36} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Reports table */}
        <div className="xl:col-span-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-sbc-grey dark:border-white/10">
            <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">TEAM REPORTS</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sbc-grey dark:border-white/10">
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Team</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">HOD</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Period</th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">No reports from your teams yet</td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-sbc-black dark:text-white font-medium">{r.serviceTeam.name}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{r.hodProfile.hodName}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{MONTHS[r.reportMonth - 1]} {r.reportYear}</td>
                      <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.description}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {a.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    {a.user ? ` · ${a.user.firstName}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
