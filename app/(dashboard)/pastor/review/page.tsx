import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import ReviewForm from '@/components/pastor/ReviewForm'
import type { ReportSummary, ExistingPastorReview } from '@/components/pastor/ReviewForm'
import { getSupervisedPastorScope } from '@/lib/pastor-scope'

export default async function PastorReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ reportId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.roles?.includes('SUPERVISOR_PASTOR')) redirect('/dashboard')

  const params = await searchParams
  if (!params.reportId) redirect('/pastor/reports')

  const scope = await getSupervisedPastorScope(session.user.id)
  if (!scope) redirect('/dashboard')

  const { pastorProfile, hodIds, teamIds } = scope

  const report = await prisma.hodReport.findUnique({
    where: { id: params.reportId },
    include: {
      serviceTeam: { select: { id: true, name: true } },
      hodProfile: { select: { hodName: true } },
      memberGrades: { select: { averageScore: true } },
      pastorReview: true,
    },
  })

  if (!report || !teamIds.includes(report.serviceTeamId) || !hodIds.includes(report.hodProfileId)) redirect('/pastor/reports')

  if (report.status === 'DRAFT') {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-8 text-center space-y-3">
        <p className="text-sbc-black dark:text-white font-medium">Report Not Yet Submitted</p>
        <p className="text-gray-500 text-sm">This report is still a draft. It must be submitted by the HOSTs before you can review it.</p>
        <Link href="/pastor/reports" className="inline-block mt-2 text-sm text-sbc-red hover:underline">
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

  const reportSummary: ReportSummary = {
    id: report.id,
    serviceTeamName: report.serviceTeam.name,
    hodName: report.hodProfile.hodName,
    reportMonth: report.reportMonth,
    reportYear: report.reportYear,
    totalMembersEnrolled: report.totalMembersEnrolled,
    avgScore,
  }

  const existingReview: ExistingPastorReview | null = report.pastorReview
    ? {
        hodGeneralAttitude: report.pastorReview.hodGeneralAttitude,
        hodTeamwork: report.pastorReview.hodTeamwork,
        hodPunctuality: report.pastorReview.hodPunctuality,
        hodAppearance: report.pastorReview.hodAppearance,
        hodAttendance: report.pastorReview.hodAttendance,
        comments: report.pastorReview.comments,
        signature: report.pastorReview.signature,
        reviewDate: report.pastorReview.reviewDate?.toISOString().split('T')[0] ?? null,
        confirmed: report.pastorReview.confirmed,
        submittedAt: report.pastorReview.submittedAt?.toISOString() ?? null,
      }
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/pastor/reports" className="text-sm text-gray-500 dark:text-gray-400 hover:text-sbc-red transition-colors">
          ← Back to Reports
        </Link>
      </div>
      <ReviewForm
        reportId={report.id}
        pastorName={pastorProfile.pastorName}
        report={reportSummary}
        existingReview={existingReview}
      />
    </div>
  )
}
