import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import TeamsClient from '@/components/admin/TeamsClient'
import type { TeamRecord, HodOption, PastorOption } from '@/components/admin/TeamsClient'

async function getData() {
  const [teams, hods, pastors] = await Promise.all([
    prisma.serviceTeam.findMany({
      orderBy: { name: 'asc' },
      include: {
        hod: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        pastor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        members: { select: { id: true } },
        _count: {
          select: {
            reports: {
              where: { status: { not: 'DRAFT' } },
            },
          },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, reportMonth: true, reportYear: true, status: true, createdAt: true },
        },
      },
    }),
    prisma.hodProfile.findMany({
      orderBy: { hodName: 'asc' },
      select: { id: true, hodName: true, userId: true },
    }),
    prisma.pastorProfile.findMany({
      orderBy: { pastorName: 'asc' },
      select: { id: true, pastorName: true, userId: true },
    }),
  ])

  type TeamSource = (typeof teams)[number]
  type TeamReportSource = TeamSource['reports'][number]

  const total = teams.length
  const assigned = teams.filter((t: TeamSource) => t.hodId !== null).length
  const unassigned = total - assigned
  const active = teams.filter((t: TeamSource) => t.isActive).length

  const safeTeams: TeamRecord[] = teams.map((t: TeamSource) => ({
      ...t,
      submittedReportCount: t._count.reports,
      reports: t.reports.map((r: TeamReportSource) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  }))

  return {
    teams: safeTeams,
    hods,
    pastors,
    stats: { total, assigned, unassigned, active },
  }
}

export default async function AdminTeamsPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) redirect('/dashboard')

  const { teams, hods, pastors, stats } = await getData()

  const hodOptions: HodOption[] = hods
  const pastorOptions: PastorOption[] = pastors

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-sbc-black dark:text-white tracking-widest">
          SERVICE TEAMS
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Manage service teams and their HOSTs / Supervising Pastor assignments
        </p>
      </div>

      <TeamsClient
        initialTeams={teams}
        hodOptions={hodOptions}
        pastorOptions={pastorOptions}
        stats={stats}
      />
    </div>
  )
}
