import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import ReportDetail from '@/components/report/ReportDetail'
import type { HeadReviewRow, ReportData, MemberGradeRow, PastorReviewRow } from '@/components/report/ReportDetail'
import ReviewForm from '@/components/pastor/ReviewForm'
import type { ReportSummary, ExistingPastorReview } from '@/components/pastor/ReviewForm'
import { getSupervisedPastorScope } from '@/lib/pastor-scope'
import { normalizeReportGoals } from '@/lib/report-goals'

export default async function PastorReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.roles?.includes('SUPERVISOR_PASTOR')) redirect('/dashboard')

  const { id } = await params

  const scope = await getSupervisedPastorScope(session.user.id)
  if (!scope) redirect('/dashboard')

  const { pastorProfile, hodIds, teamIds } = scope

  const report = await prisma.hodReport.findUnique({
    where: { id },
    include: {
      serviceTeam: { select: { name: true } },
      memberGrades: {
        include: { member: { select: { fullName: true } } },
        orderBy: { member: { fullName: 'asc' } },
      },
      pastorReview: {
        include: {
          pastor: { select: { pastorName: true } },
        },
      },
      headReview: {
        include: {
          reviewedBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  if (!report || !teamIds.includes(report.serviceTeamId) || !hodIds.includes(report.hodProfileId)) notFound()
  if (report.status === 'DRAFT') redirect('/pastor/reports')

  const reportData: ReportData = {
    id: report.id,
    serviceTeamName: report.serviceTeam.name,
    hodName: report.hodName,
    assistantOne: report.assistantOne,
    assistantTwo: report.assistantTwo,
    reportMonth: report.reportMonth,
    reportYear: report.reportYear,
    status: report.status,
    totalMembersEnrolled: report.totalMembersEnrolled,
    generalObservations: report.generalObservations,
    challengesEncountered: report.challengesEncountered,
    goalsForMonth: normalizeReportGoals(report.goalsForMonth),
    challengesForMonth: report.challengesForMonth,
    goalsNextMonth: report.goalsNextMonth,
    serviceTeamNeeds: report.serviceTeamNeeds,
    budget: report.budget,
    budgetFinancing: report.budgetFinancing,
    serviceTeamLeaderComments: report.serviceTeamLeaderComments,
    confirmation: report.confirmation,
    signature: report.signature,
    confirmationDate: report.confirmationDate?.toISOString() ?? null,
    naExplanation: report.naExplanation,
    hodSignature: report.hodSignature,
    submittedAt: report.submittedAt?.toISOString() ?? null,
  }

  const memberGrades: MemberGradeRow[] = report.memberGrades.map((g) => ({
    id: g.id,
    memberFullName: g.member.fullName,
    generalAttitude: g.generalAttitude,
    teamwork: g.teamwork,
    punctuality: g.punctuality,
    appearance: g.appearance,
    attendance: g.attendance,
    averageScore: g.averageScore,
  }))

  const scores = report.memberGrades
    .map((g) => g.averageScore)
    .filter((v): v is number => v !== null)
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null

  const reportSummary: ReportSummary = {
    id: report.id,
    serviceTeamName: report.serviceTeam.name,
    hodName: report.hodName,
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

  const pastorReview: PastorReviewRow | null = report.pastorReview
    ? {
        reviewerName: report.pastorReview.pastor.pastorName,
        hodGeneralAttitude: report.pastorReview.hodGeneralAttitude,
        hodTeamwork: report.pastorReview.hodTeamwork,
        hodPunctuality: report.pastorReview.hodPunctuality,
        hodAppearance: report.pastorReview.hodAppearance,
        hodAttendance: report.pastorReview.hodAttendance,
        comments: report.pastorReview.comments,
        reviewDate: report.pastorReview.reviewDate?.toISOString() ?? null,
        submittedAt: report.pastorReview.submittedAt?.toISOString() ?? null,
      }
    : null

  const headReview: HeadReviewRow | null = report.headReview
    ? {
        reviewerName: `${report.headReview.reviewedBy.firstName} ${report.headReview.reviewedBy.lastName ?? ''}`.trim(),
        overallComments: report.headReview.overallComments,
        supervisorReviewed: report.headReview.supervisorReviewed,
        supervisorPerformance: report.headReview.supervisorPerformance,
        reviewDate: report.headReview.reviewDate?.toISOString() ?? null,
        submittedAt: report.headReview.submittedAt?.toISOString() ?? null,
      }
    : null

  return (
    <div className="space-y-8">
      <ReportDetail
        backHref="/pastor/reports"
        backLabel="Team Reports"
        report={reportData}
        memberGrades={memberGrades}
        pastorReview={pastorReview}
        headReview={headReview}
        showPastorReview={!!pastorReview?.submittedAt}
        showHeadReview={!!headReview?.submittedAt}
      />

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-sbc-red/30" />
        <span className="font-heading text-sbc-red text-sm tracking-widest">
          SUPERVISING PASTOR REVIEW
        </span>
        <div className="flex-1 h-px bg-sbc-red/30" />
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
