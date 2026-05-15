import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import ReportDetail from '@/components/report/ReportDetail'
import type { ReportData, MemberGradeRow } from '@/components/report/ReportDetail'

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

  return (
    <ReportDetail
      backHref="/hod/reports"
      backLabel="My Reports"
      report={reportData}
      memberGrades={memberGrades}
      showPastorReview={false}
      showHeadReview={false}
    />
  )
}
