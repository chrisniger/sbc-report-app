import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import ReportForm from '@/components/hod/ReportForm'

interface SearchParams {
  teamId?: string
  month?: string
  year?: string
}

export default async function HodReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user?.roles?.includes('HOD')) redirect('/dashboard')
  const params = await searchParams

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

  const initialTeamId = teams.some((team) => team.id === params.teamId) ? params.teamId : undefined
  const parsedMonth = params.month ? parseInt(params.month) : undefined
  const parsedYear = params.year ? parseInt(params.year) : undefined
  const initialReportMonth = parsedMonth && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : undefined
  const initialReportYear = parsedYear && parsedYear >= 2026 ? parsedYear : undefined

  return (
    <ReportForm
      teams={teams}
      hodName={hodProfile.hodName}
      defaultAssistantOne={hodProfile.assistantOne}
      defaultAssistantTwo={hodProfile.assistantTwo}
      initialTeamId={initialTeamId}
      initialReportMonth={initialReportMonth}
      initialReportYear={initialReportYear}
    />
  )
}
