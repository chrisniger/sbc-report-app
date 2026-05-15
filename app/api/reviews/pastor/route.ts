import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyEvent } from '@/lib/mailer'
import { Grade } from '@prisma/client'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const gradeEnum = z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'NOT_APPLICABLE'])

const reviewBodySchema = z.object({
  reportId: z.string().min(1),
  hodGeneralAttitude: gradeEnum,
  hodTeamwork: gradeEnum,
  hodPunctuality: gradeEnum,
  hodAppearance: gradeEnum,
  hodAttendance: gradeEnum,
  comments: z.string().optional(),
  signature: z.string().optional(),
  reviewDate: z.string().optional(),
  confirmed: z.boolean().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED']),
})

// ─── POST /api/reviews/pastor ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.roles.includes('SUPERVISOR_PASTOR')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pastorProfile = await prisma.pastorProfile.findUnique({
    where: { userId: session.user.id },
    include: { serviceTeams: { select: { id: true } } },
  })
  if (!pastorProfile) return Response.json({ error: 'Pastor profile not found' }, { status: 404 })

  let body: z.infer<typeof reviewBodySchema>
  try {
    body = reviewBodySchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Fetch report and verify team ownership
  const report = await prisma.hodReport.findUnique({
    where: { id: body.reportId },
    include: {
      serviceTeam: { select: { id: true, name: true } },
      hodProfile: { select: { hodName: true } },
    },
  })
  if (!report) return Response.json({ error: 'Report not found' }, { status: 404 })

  const pastorTeamIds = pastorProfile.serviceTeams.map((t) => t.id)
  if (!pastorTeamIds.includes(report.serviceTeamId)) {
    return Response.json({ error: 'Not authorized for this report' }, { status: 403 })
  }

  // Check if review already fully submitted
  const existing = await prisma.pastorReview.findUnique({ where: { reportId: body.reportId } })
  if (existing?.submittedAt) {
    return Response.json({ error: 'ALREADY_REVIEWED', reviewId: existing.id }, { status: 409 })
  }

  const reviewData = {
    hodGeneralAttitude: body.hodGeneralAttitude as Grade,
    hodTeamwork: body.hodTeamwork as Grade,
    hodPunctuality: body.hodPunctuality as Grade,
    hodAppearance: body.hodAppearance as Grade,
    hodAttendance: body.hodAttendance as Grade,
    comments: body.comments?.trim() || null,
    signature: body.signature?.trim() || null,
    reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
    confirmed: body.confirmed ?? false,
    submittedAt: body.status === 'SUBMITTED' ? new Date() : null,
  }

  let review
  if (existing) {
    review = await prisma.pastorReview.update({ where: { id: existing.id }, data: reviewData })
  } else {
    review = await prisma.pastorReview.create({
      data: {
        ...reviewData,
        reportId: body.reportId,
        pastorId: pastorProfile.id,
        reviewedById: session.user.id,
      },
    })
  }

  // Update report status on submit
  if (body.status === 'SUBMITTED') {
    await prisma.hodReport.update({
      where: { id: body.reportId },
      data: { status: 'PASTOR_REVIEWED' },
    })
  }

  // Activity log
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: body.status === 'SUBMITTED' ? 'PASTOR_REVIEW_SUBMITTED' : 'PASTOR_REVIEW_SAVED_DRAFT',
      description: `Pastor "${pastorProfile.pastorName}" ${body.status === 'SUBMITTED' ? 'submitted review' : 'saved draft'} for "${report.serviceTeam.name}" — ${report.reportMonth}/${report.reportYear}`,
      entityType: 'PastorReview',
      entityId: review.id,
    },
  }).catch(() => null)

  // Email notification
  if (body.status === 'SUBMITTED') {
    notifyEvent('PASTOR_REVIEW_COMPLETED', {
      teamName: report.serviceTeam.name,
      month: `${MONTHS[report.reportMonth - 1]} ${report.reportYear}`,
      pastorName: pastorProfile.pastorName,
    }).catch(() => null)
  }

  return Response.json({ id: review.id, status: body.status }, { status: existing ? 200 : 201 })
}

// ─── GET /api/reviews/pastor ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.roles.includes('SUPERVISOR_PASTOR')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pastorProfile = await prisma.pastorProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!pastorProfile) return Response.json([])

  const url = new URL(request.url)
  const month = url.searchParams.get('month')
  const year = url.searchParams.get('year')

  try {
    const reviews = await prisma.pastorReview.findMany({
      where: {
        pastorId: pastorProfile.id,
        ...(month || year
          ? {
              report: {
                ...(month ? { reportMonth: parseInt(month) } : {}),
                ...(year ? { reportYear: parseInt(year) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        report: {
          include: {
            serviceTeam: { select: { id: true, name: true } },
            hodProfile: { select: { hodName: true } },
          },
        },
      },
    })
    return Response.json(reviews)
  } catch (err) {
    console.error('[GET /api/reviews/pastor]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
