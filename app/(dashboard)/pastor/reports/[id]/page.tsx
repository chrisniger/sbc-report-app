import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import ReportDetail from '@/components/report/ReportDetail'
import type { ReportData, MemberGradeRow, PastorReviewRow } from '@/components/report/ReportDetail'

export default async function PastorReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.roles?.includes('SUPERVISOR_PASTOR')) redirect('/dashboard')

  const { id } = await params

  const pastorProfile = await prisma.pastorProfile.findUnique({
    where: { userId: session.user.id },
    include: { serviceTeams: { select: { id: true } } },
  })
  if (!pastorProfile) redirect('/dashboard')

  const teamIds = pastorProfile.serviceTeams.map((t) => t.id)

  const report = await prisma.hodReport.findUnique({
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
    },
  })

  if (!report || !teamIds.includes(report.serviceTeamId)) notFound()
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

  return (
    <ReportDetail
      backHref="/pastor/reports"
      backLabel="Team Reports"
      report={reportData}
      memberGrades={memberGrades}
      pastorReview={pastorReview}
      showPastorReview
      showHeadReview={false}
    />
  )
}
