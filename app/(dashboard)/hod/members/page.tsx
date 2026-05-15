import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import MembersClient from '@/components/hod/MembersClient'

export default async function HodMembersPage() {
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

  return <MembersClient teams={teams} />
}
