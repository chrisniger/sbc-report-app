import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'PASTOR_REVIEWED', 'HEAD_REVIEWED', 'COMPLETED'] as const

type SearchResult = {
  id: string
  type: 'Report' | 'Team' | 'Member' | 'User'
  title: string
  subtitle: string
  href: string
}

function normalizeQuery(value: string | null) {
  return (value ?? '').trim().slice(0, 80)
}

function reportHref(roles: string[], reportId: string) {
  if (roles.includes('ADMIN')) return `/admin/reports/${reportId}`
  if (roles.includes('HEAD_OF_SUPERVISOR')) return `/head/reports/${reportId}`
  if (roles.includes('SUPERVISOR_PASTOR')) return `/pastor/reports/${reportId}`
  return `/hod/reports/${reportId}`
}

function teamsHref(roles: string[]) {
  if (roles.includes('ADMIN')) return '/admin/teams'
  if (roles.includes('HEAD_OF_SUPERVISOR')) return '/head/teams'
  if (roles.includes('SUPERVISOR_PASTOR')) return '/pastor/teams'
  return '/hod/members'
}

function membersHref(roles: string[]) {
  if (roles.includes('ADMIN')) return '/admin/members'
  if (roles.includes('SUPERVISOR_PASTOR')) return '/pastor/teams'
  if (roles.includes('HEAD_OF_SUPERVISOR')) return '/head/teams'
  return '/hod/members'
}

function monthFromQuery(query: string) {
  const lower = query.toLowerCase()
  const monthIndex = MONTHS.findIndex((month) => month.toLowerCase().startsWith(lower))
  return monthIndex >= 0 ? monthIndex + 1 : null
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const query = normalizeQuery(new URL(request.url).searchParams.get('q'))
  if (query.length < 2) {
    return Response.json({ results: [] })
  }

  const roles = session.user.roles
  const isAdmin = roles.includes('ADMIN')
  const isHead = roles.includes('HEAD_OF_SUPERVISOR')
  const isPastor = roles.includes('SUPERVISOR_PASTOR')
  const isHod = roles.includes('HOD')
  const parsedNumber = Number.parseInt(query, 10)
  const month = monthFromQuery(query)

  const possibleStatus = query.toUpperCase().replace(/\s+/g, '_')
  const reportFilters: Record<string, unknown>[] = [
    { serviceTeam: { name: { contains: query } } },
    { hodName: { contains: query } },
    { assistantOne: { contains: query } },
    { assistantTwo: { contains: query } },
  ]
  if (REPORT_STATUSES.includes(possibleStatus as (typeof REPORT_STATUSES)[number])) {
    reportFilters.push({ status: possibleStatus })
  }
  if (!Number.isNaN(parsedNumber)) {
    reportFilters.push({ reportYear: parsedNumber }, { reportMonth: parsedNumber })
  }
  if (month) reportFilters.push({ reportMonth: month })

  let reportAccess: Record<string, unknown> = {}
  let teamAccess: Record<string, unknown> = {}
  let memberAccess: Record<string, unknown> = {}

  if (isHod && !isAdmin) {
    const hodProfile = await prisma.hodProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!hodProfile) return Response.json({ results: [] })
    reportAccess = { hodProfileId: hodProfile.id }
    teamAccess = { hodId: hodProfile.id }
    memberAccess = { teamAssignments: { some: { team: { hodId: hodProfile.id } } } }
  } else if (isPastor && !isAdmin) {
    const pastorProfile = await prisma.pastorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!pastorProfile) return Response.json({ results: [] })
    reportAccess = { hodProfile: { supervisorId: pastorProfile.id } }
    teamAccess = { pastorId: pastorProfile.id }
    memberAccess = { teamAssignments: { some: { team: { pastorId: pastorProfile.id } } } }
  } else if (isHead && !isAdmin) {
    reportAccess = { status: { in: ['PASTOR_REVIEWED', 'HEAD_REVIEWED', 'COMPLETED'] } }
    teamAccess = { reports: { some: { status: { in: ['PASTOR_REVIEWED', 'HEAD_REVIEWED', 'COMPLETED'] } } } }
    memberAccess = {
      teamAssignments: {
        some: {
          team: { reports: { some: { status: { in: ['PASTOR_REVIEWED', 'HEAD_REVIEWED', 'COMPLETED'] } } } },
        },
      },
    }
  }

  const [reports, teams, members, users] = await Promise.all([
    prisma.hodReport.findMany({
      where: {
        ...reportAccess,
        OR: reportFilters,
      },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        reportMonth: true,
        reportYear: true,
        status: true,
        hodName: true,
        serviceTeam: { select: { name: true } },
      },
    }),
    prisma.serviceTeam.findMany({
      where: {
        ...teamAccess,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { hod: { hodName: { contains: query } } },
          { pastor: { pastorName: { contains: query } } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 5,
      select: {
        id: true,
        name: true,
        hod: { select: { hodName: true } },
        pastor: { select: { pastorName: true } },
      },
    }),
    prisma.serviceTeamMember.findMany({
      where: {
        ...memberAccess,
        OR: [
          { fullName: { contains: query } },
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } },
          { teamAssignments: { some: { team: { name: { contains: query } } } } },
        ],
      },
      orderBy: { fullName: 'asc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        phone: true,
        teamAssignments: {
          take: 2,
          select: { team: { select: { name: true } } },
        },
      },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: {
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { username: { contains: query } },
              { email: { contains: query } },
              { phone: { contains: query } },
            ],
          },
          orderBy: { firstName: 'asc' },
          take: 5,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            roles: true,
          },
        })
      : Promise.resolve([]),
  ])

  const results: SearchResult[] = [
    ...reports.map((report) => ({
      id: `report-${report.id}`,
      type: 'Report' as const,
      title: `${report.serviceTeam.name} - ${MONTHS[report.reportMonth - 1]} ${report.reportYear}`,
      subtitle: `${report.hodName} - ${report.status.replace(/_/g, ' ').toLowerCase()}`,
      href: reportHref(roles, report.id),
    })),
    ...teams.map((team) => ({
      id: `team-${team.id}`,
      type: 'Team' as const,
      title: team.name,
      subtitle: `HOSTs: ${team.hod?.hodName ?? 'Unassigned'} - Sup. Pastor: ${team.pastor?.pastorName ?? 'Unassigned'}`,
      href: teamsHref(roles),
    })),
    ...members.map((member) => ({
      id: `member-${member.id}`,
      type: 'Member' as const,
      title: member.fullName,
      subtitle: [
        member.phone,
        member.teamAssignments.map((assignment) => assignment.team.name).join(', '),
      ].filter(Boolean).join(' - '),
      href: membersHref(roles),
    })),
    ...users.map((user) => ({
      id: `user-${user.id}`,
      type: 'User' as const,
      title: `${user.firstName} ${user.lastName ?? ''}`.trim(),
      subtitle: `${user.username} - ${(user.roles as string[]).join(', ')}`,
      href: '/admin/users',
    })),
  ].slice(0, 12)

  return Response.json({ results })
}
