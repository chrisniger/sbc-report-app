import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import ReportDetail from '@/components/report/ReportDetail'
import type { ReportData, MemberGradeRow, PastorReviewRow, HeadReviewRow } from '@/components/report/ReportDetail'

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) redirect('/dashboard')

  const { id } = await params

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
          reviewedBy: { select: { firstName: true, lastName: true } },
        },
      },
      headReview: {
        include: { reviewedBy: { select: { firstName: true, lastName: true } } },
      },
    },
  })

  if (!report) notFound()

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
    totalMembersPresent: report.totalMembersPresent,
    totalMembersAbsent: report.totalMembersAbsent,
    generalObservations: report.generalObservations,
    challengesEncountered: report.challengesEncountered,
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
        reviewerName: [
          report.headReview.reviewedBy.firstName,
          report.headReview.reviewedBy.lastName,
        ].filter(Boolean).join(' '),
        overallComments: report.headReview.overallComments,
        supervisorReviewed: report.headReview.supervisorReviewed,
        supervisorPerformance: report.headReview.supervisorPerformance ?? null,
        reviewDate: report.headReview.reviewDate?.toISOString() ?? null,
        submittedAt: report.headReview.submittedAt?.toISOString() ?? null,
      }
    : null

  return (
    <ReportDetail
      backHref="/admin/reports"
      backLabel="All Reports"
      report={reportData}
      memberGrades={memberGrades}
      pastorReview={pastorReview}
      headReview={headReview}
      showPastorReview
      showHeadReview
    />
  )
}
