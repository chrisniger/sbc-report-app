import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import ReportForm from '@/components/hod/ReportForm'

export default async function HodReportPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('HOD')) redirect('/dashboard')

  const hodProfile = await prisma.hodProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      serviceTeams: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          members: {
            include: {
              member: {
                select: { id: true, fullName: true, isActive: true },
              },
            },
          },
        },
      },
    },
  })

  if (!hodProfile) redirect('/dashboard')

  const teams = hodProfile.serviceTeams.map((team) => ({
    id: team.id,
    name: team.name,
    members: team.members
      .filter((a) => a.member.isActive)
      .map((a) => ({ id: a.member.id, fullName: a.member.fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
  }))

  return (
    <ReportForm
      teams={teams}
      hodName={hodProfile.hodName}
      defaultAssistantOne={hodProfile.assistantOne}
      defaultAssistantTwo={hodProfile.assistantTwo}
    />
  )
}
