import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  FileText,
  MoreHorizontal,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const trendScores = [60, 69, 64, 76, 78, 90, 79]
const trendMonths = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
const panelClass =
  'rounded-lg border border-slate-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] overflow-hidden dark:border-sbc-red/20 dark:bg-white/[0.055] dark:shadow-[0_22px_70px_rgba(200,16,46,0.12)] dark:backdrop-blur-xl'
const iconTileClass =
  'flex h-11 w-11 items-center justify-center rounded-lg bg-sbc-red/10 text-sbc-red dark:bg-sbc-red/15 dark:text-sbc-red'

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
  type SubmissionRecord = (typeof submissions)[number]
  type ActivityRecord = (typeof activities)[number]

  return (
    <div className="space-y-7">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Service Teams" value={teamCount} subtitle="Active teams" color="red" icon={<Users size={36} />} />
        <StatCard label="Reports This Month" value={reportCount} subtitle={`${MONTHS[month - 1]} ${year}`} color="amber" icon={<FileText size={36} />} />
        <StatCard label="Members Enrolled" value={memberCount} subtitle="Active members" color="green" icon={<UserCheck size={36} />} />
        <StatCard label="Reviews Pending" value={pendingCount} subtitle="Awaiting pastor review" color="blue" icon={<ClipboardList size={36} />} />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Submissions table */}
        <div className={`xl:col-span-2 min-h-[420px] ${panelClass}`}>
          <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200 dark:border-sbc-red/15">
            <div className="flex items-center gap-4">
              <div className={iconTileClass}>
                <FileText size={22} />
              </div>
              <h2 className="font-heading text-sbc-red dark:text-white text-2xl tracking-widest">
                SUBMISSIONS
              </h2>
            </div>
            <div className="flex gap-2">
              <select defaultValue={month} className="text-sm bg-white dark:bg-white/[0.055] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white outline-none shadow-sm">
                {MONTHS.map((m: string, i: number) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select defaultValue={year} className="text-sm bg-white dark:bg-white/[0.055] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white outline-none shadow-sm">
                {Array.from({ length: 10 }, (_: unknown, i: number) => 2026 + i).map((y: number) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white dark:border-sbc-red/15 dark:bg-sbc-red/[0.04]">
                  <th className="text-left px-7 py-5 text-slate-500 dark:text-white/55 text-sm uppercase tracking-wide font-bold">Team</th>
                  <th className="text-left px-7 py-5 text-slate-500 dark:text-white/55 text-sm uppercase tracking-wide font-bold">HOSTs</th>
                  <th className="text-left px-7 py-5 text-slate-500 dark:text-white/55 text-sm uppercase tracking-wide font-bold">Date</th>
                  <th className="text-left px-7 py-5 text-slate-500 dark:text-white/55 text-sm uppercase tracking-wide font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-7 py-12 text-center text-slate-400 text-sm">
                      No submissions yet
                    </td>
                  </tr>
                ) : (
                  submissions.map((r: SubmissionRecord) => (
                    <tr key={r.id} className="border-b border-slate-200/80 dark:border-white/5 hover:bg-sbc-red/[0.025] dark:hover:bg-white/[0.035] transition-colors">
                      <td className="px-7 py-5 text-slate-950 dark:text-white font-semibold">{r.serviceTeam.name}</td>
                      <td className="px-7 py-5 text-slate-600 dark:text-white/60">{r.hodProfile.hodName}</td>
                      <td className="px-7 py-5 text-slate-600 dark:text-white/60">
                        {r.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-7 py-5">
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
        <div className="space-y-6">
          {/* Score trend */}
          <div className={`${panelClass} p-6`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={iconTileClass}>
                  <TrendingUp size={22} />
                </div>
                <h2 className="font-heading text-sbc-red dark:text-white text-2xl tracking-widest">SCORE TREND</h2>
              </div>
              <MoreHorizontal size={22} className="text-slate-400 dark:text-white/55" />
            </div>
            <div className="grid grid-cols-[32px_1fr] gap-3">
              <div className="flex h-40 flex-col justify-between text-sm text-slate-500 dark:text-white/55">
                {[100, 75, 50, 25, 0].map((tick: number) => <span key={tick}>{tick}</span>)}
              </div>
              <div>
                <div className="flex h-40 items-end gap-4 border-l border-b border-slate-200 bg-[linear-gradient(to_bottom,rgba(148,163,184,0.22)_1px,transparent_1px)] bg-[length:100%_25%] pl-4 dark:border-white/10 dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)]">
                  {trendScores.map((score: number, i: number) => (
                    <div
                      key={trendMonths[i]}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-sbc-red to-rose-400 shadow-[0_10px_18px_rgba(200,16,46,0.22)]"
                      style={{ height: `${score}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between pl-4 pt-3 text-sm text-slate-500 dark:text-white/70">
                  {trendMonths.map((m: string) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Activity feed */}
          <div className={panelClass}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-sbc-red/15">
              <div className="flex items-center gap-4">
                <div className={iconTileClass}>
                  <Bell size={22} />
                </div>
                <h2 className="font-heading text-sbc-red dark:text-white text-2xl tracking-widest">ACTIVITY</h2>
              </div>
              <MoreHorizontal size={22} className="text-slate-400 dark:text-white/55" />
            </div>
            <div className="px-6 py-6">
              {activities.length === 0 ? (
                <p className="py-6 text-slate-400 text-sm text-center">No recent activity</p>
              ) : (
                activities.slice(0, 1).map((a: ActivityRecord) => (
                  <div key={a.id} className="relative flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <span className="h-3 w-3 rounded-full bg-sbc-red" />
                      <span className="mt-1 h-16 w-px bg-slate-200 dark:bg-sbc-red/30" />
                    </div>
                    <div className="min-w-0 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="hidden h-12 w-12 items-center justify-center rounded-full bg-sbc-red text-white shadow-lg shadow-sbc-red/20 sm:flex">
                          <CheckCircle2 size={22} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-950 dark:text-white font-semibold leading-tight">{a.action}</p>
                          <p className="text-sm text-slate-500 dark:text-white/60 mt-1 line-clamp-1">{a.description}</p>
                          <p className="text-sm text-slate-500 dark:text-white/55 mt-1">
                            {a.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {a.user ? ` - ${a.user.firstName} ${a.user.lastName ?? ''}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button className="mt-2 flex w-full items-center justify-center rounded-lg bg-sbc-red/10 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-sbc-red/15 hover:text-sbc-red dark:bg-white/[0.04] dark:text-white/60 dark:hover:text-white">
                View all activity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
