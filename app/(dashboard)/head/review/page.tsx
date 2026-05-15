import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import HeadReviewForm from '@/components/head/HeadReviewForm'
import type { HeadReportSummary, PastorReviewSummary, ExistingHeadReview } from '@/components/head/HeadReviewForm'

export default async function HeadReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ reportId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.roles?.includes('HEAD_OF_SUPERVISOR')) redirect('/dashboard')

  const params = await searchParams
  if (!params.reportId) redirect('/head/reports')

  const headProfile = await prisma.headOfSupervisorProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!headProfile) redirect('/dashboard')

  const report = await prisma.hodReport.findUnique({
    where: { id: params.reportId },
    include: {
      serviceTeam: { select: { id: true, name: true } },
      hodProfile: { select: { hodName: true } },
      memberGrades: { select: { averageScore: true } },
      pastorReview: {
        include: {
          pastor: { select: { pastorName: true } },
        },
      },
      headReview: true,
    },
  })

  if (!report) redirect('/head/reports')

  if (report.status === 'DRAFT' || report.status === 'SUBMITTED') {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-8 text-center space-y-3">
        <p className="text-sbc-black dark:text-white font-medium">Report Not Ready for Head Review</p>
        <p className="text-gray-500 text-sm">
          {report.status === 'DRAFT'
            ? 'This report is still a draft and has not been submitted by the HOD.'
            : 'This report has been submitted but has not yet been reviewed by the Supervisor Pastor.'}
        </p>
        <Link href="/head/reports" className="inline-block mt-2 text-sm text-sbc-red hover:underline">
          ← Back to Reports
        </Link>
      </div>
    )
  }

  const avgScores = report.memberGrades
    .map((g) => g.averageScore)
    .filter((v): v is number => v !== null)
  const avgScore = avgScores.length > 0
    ? avgScores.reduce((a, b) => a + b, 0) / avgScores.length
    : null

  const reportSummary: HeadReportSummary = {
    id: report.id,
    serviceTeamName: report.serviceTeam.name,
    hodName: report.hodProfile.hodName,
    reportMonth: report.reportMonth,
    reportYear: report.reportYear,
    totalMembersEnrolled: report.totalMembersEnrolled,
    totalMembersPresent: report.totalMembersPresent,
    totalMembersAbsent: report.totalMembersAbsent,
    avgScore,
  }

  const pastorReviewSummary: PastorReviewSummary | null = report.pastorReview
    ? {
        id: report.pastorReview.id,
        pastorName: report.pastorReview.pastor.pastorName,
        hodGeneralAttitude: report.pastorReview.hodGeneralAttitude,
        hodTeamwork: report.pastorReview.hodTeamwork,
        hodPunctuality: report.pastorReview.hodPunctuality,
        hodAppearance: report.pastorReview.hodAppearance,
        hodAttendance: report.pastorReview.hodAttendance,
        comments: report.pastorReview.comments,
        submittedAt: report.pastorReview.submittedAt?.toISOString() ?? null,
      }
    : null

  const existingReview: ExistingHeadReview | null = report.headReview
    ? {
        overallComments: report.headReview.overallComments,
        supervisorReviewed: report.headReview.supervisorReviewed,
        supervisorPerformance: report.headReview.supervisorPerformance,
        signature: report.headReview.signature,
        reviewDate: report.headReview.reviewDate?.toISOString().split('T')[0] ?? null,
        confirmed: report.headReview.confirmed,
        submittedAt: report.headReview.submittedAt?.toISOString() ?? null,
      }
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/head/reports" className="text-sm text-gray-500 dark:text-gray-400 hover:text-sbc-red transition-colors">
          ← Back to Reports
        </Link>
      </div>
      <HeadReviewForm
        reportId={report.id}
        headName={headProfile.headName}
        report={reportSummary}
        pastorReview={pastorReviewSummary}
        existingReview={existingReview}
      />
    </div>
  )
}
