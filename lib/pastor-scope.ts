import { prisma } from '@/lib/db'

export async function getSupervisedPastorScope(userId: string) {
  const pastorProfile = await prisma.pastorProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      pastorName: true,
      hods: {
        select: {
          id: true,
          serviceTeams: { select: { id: true } },
        },
      },
    },
  })

  if (!pastorProfile) return null

  const hodIds = pastorProfile.hods.map((hod) => hod.id)
  const teamIds = [...new Set(
    pastorProfile.hods.flatMap((hod) => hod.serviceTeams.map((team) => team.id))
  )]

  return { pastorProfile, hodIds, teamIds }
}
