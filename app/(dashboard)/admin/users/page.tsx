import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import UsersClient from '@/components/admin/UsersClient'
import type { UserRecord, TeamOption, PastorOption, HeadOption } from '@/components/admin/UsersClient'

async function getData() {
  const [users, teams, pastors, heads] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        hodProfile: {
          include: {
            serviceTeams: { select: { id: true, name: true } },
            supervisor: { select: { id: true, pastorName: true } },
          },
        },
        pastorProfile: {
          include: {
            head: { select: { id: true, headName: true } },
          },
        },
        headProfile: {
          select: { id: true, headName: true },
        },
      },
    }),
    prisma.serviceTeam.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.pastorProfile.findMany({
      orderBy: { pastorName: 'asc' },
      select: { id: true, pastorName: true, userId: true },
    }),
    prisma.headOfSupervisorProfile.findMany({
      orderBy: { headName: 'asc' },
      select: { id: true, headName: true, userId: true },
    }),
  ])

  type UserSource = (typeof users)[number]

  const safeUsers: UserRecord[] = users.map(({ passwordHash: _pw, ...u }: UserSource) => ({
    ...u,
    roles: u.roles as string[],
  }))

  return { users: safeUsers, teams, pastors, heads }
}

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) redirect('/dashboard')

  const { users, teams, pastors, heads } = await getData()

  const allTeams: TeamOption[] = teams
  const allPastors: PastorOption[] = pastors
  const allHeads: HeadOption[] = heads

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-sbc-black dark:text-white tracking-widest">
          USER MANAGEMENT
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Manage all system users and their roles
        </p>
      </div>

      <UsersClient
        initialUsers={users}
        allTeams={allTeams}
        allPastors={allPastors}
        allHeads={allHeads}
        currentUserId={session.user.id}
      />
    </div>
  )
}
