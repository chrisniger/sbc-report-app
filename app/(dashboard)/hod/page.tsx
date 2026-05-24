import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Users, FileText, Star, AlertCircle, Eye } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

async function getData(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  try {
    const hodProfile = await prisma.hodProfile.findUnique({ where: { userId } })
    if (!hodProfile) return null

    const hodId = hodProfile.id
    const [memberCount, submittedCount, pendingCount, reports, avgScore] =
      await Promise.all([
        prisma.serviceTeamMember.count({
          where: {
            teamAssignments: {
              some: { team: { hodId } },
            },
            isActive: true,
          },
        }),
        prisma.hodReport.count({
          where: { hodProfileId: hodId, status: { not: 'DRAFT' } },
        }),
        prisma.hodReport.count({
          where: { hodProfileId: hodId, status: 'DRAFT' },
        }),
        prisma.hodReport.findMany({
          where: { hodProfileId: hodId },
          take: 12,
          orderBy: { createdAt: 'desc' },
          include: {
            serviceTeam: { select: { name: true } },
            headReview: { select: { submittedAt: true } },
          },
        }),
        prisma.reportMemberGrade.aggregate({
          where: { report: { hodProfileId: hodId } },
          _avg: { averageScore: true },
        }),
      ])

    const lastAvg = avgScore._avg.averageScore
    return { hodProfile, memberCount, submittedCount, pendingCount, reports, lastAvg, month, year }
  } catch {
    return null
  }
}

function DashboardReportStatus({
  status,
  committeeReviewed,
}: {
  status: string
  committeeReviewed: boolean
}) {
  if (committeeReviewed) {
    return (
      <span className="inline-flex items-center rounded-full border border-purple-500/15 bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
        Reviewed
      </span>
    )
  }

  return <StatusBadge status={status} />
}

export default async function HodDashboardPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('HOD')) redirect('/dashboard')

  const data = await getData(session.user.id)
  if (!data) redirect('/login')

  const { memberCount, submittedCount, pendingCount, reports, lastAvg } = data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="My Team Members" value={memberCount} subtitle="Add Member" color="red" icon={<Users size={36} />} href="/hod/members?add=1" />
        <StatCard label="Reports Submitted" value={submittedCount} subtitle="Add Report" color="green" icon={<FileText size={36} />} href="/hod/report" />
        <StatCard
          label="Last Avg Score"
          value={lastAvg != null ? lastAvg.toFixed(1) : '-'}
          subtitle="Average member score"
          color="amber"
          icon={<Star size={36} />}
        />
        <StatCard label="Pending Reports" value={pendingCount} subtitle="Draft reports" color="blue" icon={<AlertCircle size={36} />} />
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-sbc-grey dark:border-white/10">
          <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">MY REPORTS</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sbc-grey dark:border-white/10">
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">TEAM</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">PERIOD</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">STATUS</th>
                <th className="text-right px-5 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium">VIEW</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">No reports yet</td>
                </tr>
              ) : (
                reports.map((r) => {
                  const committeeReviewed = Boolean(r.headReview?.submittedAt)

                  return (
                    <tr key={r.id} className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-sbc-black dark:text-white font-medium">{r.serviceTeam.name}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{MONTHS[r.reportMonth - 1]} {r.reportYear}</td>
                      <td className="px-5 py-3">
                        <DashboardReportStatus status={r.status} committeeReviewed={committeeReviewed} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/hod/reports/${r.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-sbc-red/20 px-2.5 py-1 text-xs font-semibold text-sbc-red transition-colors hover:bg-sbc-red hover:text-white dark:border-sbc-red/40 dark:hover:bg-sbc-red"
                          aria-label={`View ${r.serviceTeam.name} report for ${MONTHS[r.reportMonth - 1]} ${r.reportYear}`}
                        >
                          <Eye size={14} aria-hidden="true" />
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
    </div>
  )
}
