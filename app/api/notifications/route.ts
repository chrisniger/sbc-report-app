import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type NotificationItem = {
  id: string
  title: string
  body: string
  href: string
  createdAt: Date
  kind: 'report' | 'review' | 'system'
}

function period(month: number, year: number) {
  return `${MONTHS[month - 1]} ${year}`
}

function unreadCount(items: NotificationItem[], since: Date | null) {
  if (!since) return items.length
  return items.filter((item) => item.createdAt > since).length
}

function parseSince(request: NextRequest) {
  const raw = new URL(request.url).searchParams.get('since')
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roles = session.user.roles
  const since = parseSince(request)
  const items: NotificationItem[] = []

  if (roles.includes('ADMIN')) {
    const [submittedReports, activities] = await Promise.all([
      prisma.hodReport.findMany({
        where: { status: { not: 'DRAFT' } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reportMonth: true,
          reportYear: true,
          status: true,
          updatedAt: true,
          serviceTeam: { select: { name: true } },
          hodProfile: { select: { hodName: true } },
        },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          action: true,
          description: true,
          createdAt: true,
        },
      }),
    ])

    items.push(
      ...submittedReports.map((report) => ({
        id: `admin-report-${report.id}`,
        title: `${report.serviceTeam.name} report ${report.status.replace(/_/g, ' ').toLowerCase()}`,
        body: `${report.hodProfile.hodName} - ${period(report.reportMonth, report.reportYear)}`,
        href: `/admin/reports`,
        createdAt: report.updatedAt,
        kind: 'report' as const,
      })),
      ...activities.map((activity) => ({
        id: `activity-${activity.id}`,
        title: activity.action.replace(/_/g, ' '),
        body: activity.description,
        href: '/admin/backup',
        createdAt: activity.createdAt,
        kind: 'system' as const,
      }))
    )
  }

  if (roles.includes('HOD')) {
    const reports = await prisma.hodReport.findMany({
      where: {
        hodProfile: { userId: session.user.id },
        status: { in: ['PASTOR_REVIEWED', 'HEAD_REVIEWED', 'COMPLETED'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        reportMonth: true,
        reportYear: true,
        status: true,
        updatedAt: true,
        serviceTeam: { select: { name: true } },
        pastorReview: { select: { submittedAt: true } },
        headReview: { select: { submittedAt: true } },
      },
    })

    items.push(
      ...reports.map((report) => ({
        id: `hod-review-${report.id}-${report.status}`,
        title: report.status === 'HEAD_REVIEWED' ? 'Committee review completed' : 'Supervising Pastor review completed',
        body: `${report.serviceTeam.name} - ${period(report.reportMonth, report.reportYear)}`,
        href: `/hod/reports/${report.id}`,
        createdAt: report.headReview?.submittedAt ?? report.pastorReview?.submittedAt ?? report.updatedAt,
        kind: 'review' as const,
      }))
    )
  }

  if (roles.includes('SUPERVISOR_PASTOR')) {
    const [pendingReports, committeeReviewed] = await Promise.all([
      prisma.hodReport.findMany({
        where: {
          status: 'SUBMITTED',
          hodProfile: { supervisor: { userId: session.user.id } },
        },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          reportMonth: true,
          reportYear: true,
          submittedAt: true,
          updatedAt: true,
          serviceTeam: { select: { name: true } },
          hodProfile: { select: { hodName: true } },
        },
      }),
      prisma.hodReport.findMany({
        where: {
          status: { in: ['HEAD_REVIEWED', 'COMPLETED'] },
          hodProfile: { supervisor: { userId: session.user.id } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reportMonth: true,
          reportYear: true,
          updatedAt: true,
          serviceTeam: { select: { name: true } },
          headReview: { select: { submittedAt: true } },
        },
      }),
    ])

    items.push(
      ...pendingReports.map((report) => ({
        id: `pastor-pending-${report.id}`,
        title: 'Report awaiting your review',
        body: `${report.serviceTeam.name} from ${report.hodProfile.hodName} - ${period(report.reportMonth, report.reportYear)}`,
        href: `/pastor/reports/${report.id}`,
        createdAt: report.submittedAt ?? report.updatedAt,
        kind: 'report' as const,
      })),
      ...committeeReviewed.map((report) => ({
        id: `pastor-head-${report.id}`,
        title: 'Committee review completed',
        body: `${report.serviceTeam.name} - ${period(report.reportMonth, report.reportYear)}`,
        href: `/pastor/reports/${report.id}`,
        createdAt: report.headReview?.submittedAt ?? report.updatedAt,
        kind: 'review' as const,
      }))
    )
  }

  if (roles.includes('HEAD_OF_SUPERVISOR')) {
    const reports = await prisma.hodReport.findMany({
      where: { status: 'PASTOR_REVIEWED' },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        reportMonth: true,
        reportYear: true,
        updatedAt: true,
        serviceTeam: { select: { name: true } },
        hodProfile: { select: { hodName: true } },
        pastorReview: { select: { submittedAt: true, pastor: { select: { pastorName: true } } } },
      },
    })

    items.push(
      ...reports.map((report) => ({
        id: `head-pending-${report.id}`,
        title: 'Report awaiting Committee review',
        body: `${report.serviceTeam.name} from ${report.hodProfile.hodName} - reviewed by ${report.pastorReview?.pastor.pastorName ?? 'Supervising Pastor'}`,
        href: `/head/reports/${report.id}`,
        createdAt: report.pastorReview?.submittedAt ?? report.updatedAt,
        kind: 'report' as const,
      }))
    )
  }

  const sorted = items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 12)

  return Response.json({
    unreadCount: unreadCount(sorted, since),
    items: sorted.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  })
}
