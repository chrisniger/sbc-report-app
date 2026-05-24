import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import ReportDetail from '@/components/report/ReportDetail'
import type { HeadReviewRow, ReportData, MemberGradeRow, PastorReviewRow } from '@/components/report/ReportDetail'
import { normalizeReportGoals } from '@/lib/report-goals'

export default async function HodReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.roles?.includes('HOD')) redirect('/dashboard')

  const { id } = await params

  const hodProfile = await prisma.hodProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!hodProfile) redirect('/dashboard')

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

  if (!report || report.hodProfileId !== hodProfile.id) notFound()

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
    <ReportDetail
      backHref="/hod/reports"
      backLabel="My Reports"
      report={reportData}
      memberGrades={memberGrades}
      pastorReview={pastorReview}
      headReview={headReview}
      showPastorReview={!!pastorReview?.submittedAt}
      showPastorReviewGrades={false}
      showHeadReview={!!headReview?.submittedAt}
    />
  )
}
