import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import ReportDetail from '@/components/report/ReportDetail'
import type { ReportData, HeadReviewRow, MemberGradeRow, PastorReviewRow } from '@/components/report/ReportDetail'
import HeadReviewForm from '@/components/head/HeadReviewForm'
import type { ExistingHeadReview, HeadReportSummary, PastorReviewSummary } from '@/components/head/HeadReviewForm'
import { normalizeReportGoals } from '@/lib/report-goals'

export default async function HeadReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const roles = session?.user?.roles ?? []
  if (!roles.includes('HEAD_OF_SUPERVISOR') && !roles.includes('PASTOR')) redirect('/dashboard')

  const { id } = await params
  const canReview = roles.includes('HEAD_OF_SUPERVISOR')

  const [report, headProfile] = await Promise.all([
    prisma.hodReport.findUnique({
      where: { id },
      include: {
        serviceTeam: { select: { name: true } },
        memberGrades: {
          include: { member: { select: { fullName: true } } },
          orderBy: { member: { fullName: 'asc' } },
        },
        pastorReview: {
          include: { pastor: { select: { pastorName: true } } },
        },
        headReview: {
          include: { reviewedBy: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    canReview
      ? prisma.headOfSupervisorProfile.findUnique({
          where: { userId: session!.user.id },
          select: { headName: true },
        })
      : Promise.resolve(null),
  ])

  if (!report || report.status === 'DRAFT') notFound()

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
    .filter((value): value is number => value !== null)
  const avgScore = scores.length > 0 ? scores.reduce((total, score) => total + score, 0) / scores.length : null

  const reportSummary: HeadReportSummary = {
    id: report.id,
    serviceTeamName: report.serviceTeam.name,
    hodName: report.hodName,
    reportMonth: report.reportMonth,
    reportYear: report.reportYear,
    totalMembersEnrolled: report.totalMembersEnrolled,
    avgScore,
  }

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

  const existingHeadReview: ExistingHeadReview | null = report.headReview
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
    <div className="space-y-5">
      {!pastorReview && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-amber-700 dark:text-amber-400 text-sm">
          <span className="text-lg">⏳</span>
          <span>Awaiting Supervising Pastor Review</span>
        </div>
      )}
      <ReportDetail
        backHref="/head/reports"
        backLabel="All Reports"
        report={reportData}
        memberGrades={memberGrades}
        pastorReview={pastorReview}
        headReview={headReview}
        showPastorReview={!!pastorReview}
        showHeadReview={!!headReview?.submittedAt}
      />
      {canReview && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-sbc-red/30" />
            <span className="font-heading text-sbc-red text-sm tracking-widest">
              COMMITTEE REVIEW
            </span>
            <div className="flex-1 h-px bg-sbc-red/30" />
          </div>

          <HeadReviewForm
            reportId={report.id}
            headName={headProfile?.headName ?? 'Committee'}
            report={reportSummary}
            pastorReview={pastorReviewSummary}
            existingReview={existingHeadReview}
          />
        </>
      )}
    </div>
  )
}
