import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import MembersAdminClient from '@/components/admin/MembersAdminClient'
import type { MemberRecord, TeamFilterOption } from '@/components/admin/MembersAdminClient'

async function getData() {
  const [members, teams] = await Promise.all([
    prisma.serviceTeamMember.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        teamAssignments: {
          include: { team: { select: { id: true, name: true } } },
        },
        reportGrades: {
          select: { averageScore: true },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
    prisma.serviceTeam.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return { members, teams }
}

export default async function AdminMembersPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) redirect('/dashboard')

  const { members, teams } = await getData()

  type MemberSource = (typeof members)[number]

  const safeMembers: MemberRecord[] = members.map((m: MemberSource) => ({
    ...m,
    createdBy: m.createdBy ?? null,
  }))

  const allTeams: TeamFilterOption[] = teams

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-sbc-black dark:text-white tracking-widest">
          ALL MEMBERS
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Central view of all service team members
        </p>
      </div>

      <MembersAdminClient initialMembers={safeMembers} allTeams={allTeams} />
    </div>
  )
}
