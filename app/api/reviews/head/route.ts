import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyEvent } from '@/lib/mailer'
import { Grade } from '@prisma/client'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const gradeEnum = z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'NOT_APPLICABLE'])

const headReviewBodySchema = z.object({
  reportId: z.string().min(1),
  pastorReviewId: z.string().optional(),
  overallComments: z.string().optional(),
  supervisorReviewed: z.string().optional(),
  supervisorPerformance: gradeEnum.optional(),
  signature: z.string().optional(),
  reviewDate: z.string().optional(),
  confirmed: z.boolean().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED']),
})

// ─── POST /api/reviews/head ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.roles.includes('HEAD_OF_SUPERVISOR')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const headProfile = await prisma.headOfSupervisorProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!headProfile) return Response.json({ error: 'Head profile not found' }, { status: 404 })

  let body: z.infer<typeof headReviewBodySchema>
  try {
    body = headReviewBodySchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Fetch report
  const report = await prisma.hodReport.findUnique({
    where: { id: body.reportId },
    include: {
      serviceTeam: { select: { name: true } },
      hodProfile: { select: { hodName: true } },
      pastorReview: { select: { id: true } },
    },
  })
  if (!report) return Response.json({ error: 'Report not found' }, { status: 404 })

  // Check if head review already submitted
  const existing = await prisma.headReview.findUnique({ where: { reportId: body.reportId } })
  if (existing?.submittedAt) {
    return Response.json({ error: 'ALREADY_REVIEWED', reviewId: existing.id }, { status: 409 })
  }

  const pastorReviewId = body.pastorReviewId ?? report.pastorReview?.id ?? null

  const reviewData = {
    overallComments: body.overallComments?.trim() || null,
    supervisorReviewed: body.supervisorReviewed?.trim() || null,
    supervisorPerformance: body.supervisorPerformance
      ? (body.supervisorPerformance as Grade)
      : null,
    signature: body.signature?.trim() || null,
    reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
    confirmed: body.confirmed ?? false,
    submittedAt: body.status === 'SUBMITTED' ? new Date() : null,
  }

  let review
  if (existing) {
    review = await prisma.headReview.update({ where: { id: existing.id }, data: reviewData })
  } else {
    review = await prisma.headReview.create({
      data: {
        ...reviewData,
        reportId: body.reportId,
        pastorReviewId,
        headProfileId: headProfile.id,
        reviewedById: session.user.id,
      },
    })
  }

  // Update report status on submit
  if (body.status === 'SUBMITTED') {
    await prisma.hodReport.update({
      where: { id: body.reportId },
      data: { status: 'HEAD_REVIEWED' },
    })
  }

  // Activity log
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: body.status === 'SUBMITTED' ? 'HEAD_REVIEW_SUBMITTED' : 'HEAD_REVIEW_SAVED_DRAFT',
      description: `Head "${headProfile.headName}" ${body.status === 'SUBMITTED' ? 'submitted review' : 'saved draft'} for "${report.serviceTeam.name}" — ${report.reportMonth}/${report.reportYear}`,
      entityType: 'HeadReview',
      entityId: review.id,
    },
  }).catch(() => null)

  // Email notification
  if (body.status === 'SUBMITTED') {
    notifyEvent('HEAD_REVIEW_COMPLETED', {
      teamName: report.serviceTeam.name,
      month: `${MONTHS[report.reportMonth - 1]} ${report.reportYear}`,
    }).catch(() => null)
  }

  return Response.json({ id: review.id, status: body.status }, { status: existing ? 200 : 201 })
}

// ─── GET /api/reviews/head ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const roles = session.user.roles
  if (!roles.includes('HEAD_OF_SUPERVISOR') && !roles.includes('PASTOR')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const month = url.searchParams.get('month')
  const year = url.searchParams.get('year')

  try {
    const reviews = await prisma.headReview.findMany({
      where: {
        ...(roles.includes('PASTOR') && !roles.includes('HEAD_OF_SUPERVISOR')
          ? { submittedAt: { not: null } }
          : { reviewedById: session.user.id }),
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
        pastorReview: { select: { id: true, submittedAt: true } },
      },
    })
    return Response.json(reviews)
  } catch (err) {
    console.error('[GET /api/reviews/head]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
