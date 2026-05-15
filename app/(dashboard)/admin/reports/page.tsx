import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import ReportsAdminClient from '@/components/admin/ReportsAdminClient'
import type { ReportRecord, SummaryStats } from '@/components/admin/ReportsAdminClient'

async function getData() {
  const [reports, teams, pastors] = await Promise.all([
    prisma.hodReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        serviceTeam: { select: { id: true, name: true } },
        hodProfile: { select: { id: true, hodName: true } },
        pastorReview: { select: { id: true, submittedAt: true } },
        headReview: { select: { id: true, submittedAt: true } },
        memberGrades: {
          select: {
            id: true,
            averageScore: true,
            member: { select: { id: true, fullName: true } },
          },
        },
      },
    }),
    prisma.serviceTeam.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.pastorProfile.findMany({
      orderBy: { pastorName: 'asc' },
      select: { id: true, pastorName: true },
    }),
  ])

  const safeReports: ReportRecord[] = reports.map((r) => ({
    ...r,
    submittedAt: r.submittedAt?.toISOString() ?? null,
    pastorReview: r.pastorReview
      ? { ...r.pastorReview, submittedAt: r.pastorReview.submittedAt?.toISOString() ?? null }
      : null,
    headReview: r.headReview
      ? { ...r.headReview, submittedAt: r.headReview.submittedAt?.toISOString() ?? null }
      : null,
  }))

  const stats: SummaryStats = {
    total: reports.length,
    submitted: reports.filter((r) => r.status === 'SUBMITTED').length,
    pastorReviewed: reports.filter((r) => r.status === 'PASTOR_REVIEWED').length,
    headReviewed: reports.filter((r) => r.status === 'HEAD_REVIEWED' || r.status === 'COMPLETED').length,
    pending: reports.filter((r) => r.status === 'SUBMITTED').length,
  }

  return { reports: safeReports, teams, pastors, stats }
}

export default async function AdminReportsPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) redirect('/dashboard')

  const { reports, teams, pastors, stats } = await getData()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-sbc-black dark:text-white tracking-widest">
          ALL REPORTS
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          View and filter all submitted HOD reports
        </p>
      </div>

      <ReportsAdminClient
        initialReports={reports}
        stats={stats}
        teams={teams}
        pastors={pastors}
      />
    </div>
  )
}
