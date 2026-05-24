import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import MembersClient from '@/components/hod/MembersClient'

interface HodMembersPageProps {
  searchParams: Promise<{ add?: string | string[] | undefined }>
}

export default async function HodMembersPage({ searchParams }: HodMembersPageProps) {
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
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                  homeLocation: true,
                  isActive: true,
                },
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
      .map((a) => ({
        id: a.member.id,
        fullName: a.member.fullName,
        phone: a.member.phone,
        homeLocation: a.member.homeLocation,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
  }))
  const openAddMember = Array.isArray(params.add)
    ? params.add.includes('1')
    : params.add === '1'

  return <MembersClient teams={teams} openAddMember={openAddMember} />
}
