import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyEvent } from '@/lib/mailer'
import { computeAverageScore } from '@/lib/grade-utils'
import { Grade } from '@prisma/client'

// ─── Validation schema ─────────────────────────────────────────────────────

const gradeZ = z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'NOT_APPLICABLE'])

const memberGradeZ = z.object({
  memberId: z.string().min(1),
  generalAttitude: gradeZ,
  teamwork: gradeZ,
  punctuality: gradeZ,
  appearance: gradeZ,
  attendance: gradeZ,
})

const reportBodySchema = z.object({
  teamId: z.string().min(1),
  reportMonth: z.number().int().min(1).max(12),
  reportYear: z.number().int().min(2026).max(2035),
  assistantOne: z.string().optional(),
  assistantTwo: z.string().optional(),
  totalMembersPresent: z.number().int().min(0),
  generalObservations: z.string().optional(),
  challengesEncountered: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED']),
  memberGrades: z.array(memberGradeZ),
})

type ReportBody = z.infer<typeof reportBodySchema>

// ─── POST /api/reports ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.user.roles.includes('HOD')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const hodProfile = await prisma.hodProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!hodProfile) {
    return Response.json({ error: 'HOD profile not found' }, { status: 404 })
  }

  let body: ReportBody
  try {
    const raw = await request.json()
    body = reportBodySchema.parse(raw)
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Verify the team belongs to this HOD
  const team = await prisma.serviceTeam.findFirst({
    where: { id: body.teamId, hodId: hodProfile.id },
  })
  if (!team) {
    return Response.json({ error: 'Team not found or not assigned to you' }, { status: 403 })
  }

  // Check duplicate
  const existing = await prisma.hodReport.findUnique({
    where: {
      hodProfileId_serviceTeamId_reportMonth_reportYear: {
        hodProfileId: hodProfile.id,
        serviceTeamId: body.teamId,
        reportMonth: body.reportMonth,
        reportYear: body.reportYear,
      },
    },
  })

  if (existing?.status === 'SUBMITTED' || existing?.status === 'PASTOR_REVIEWED' ||
      existing?.status === 'HEAD_REVIEWED' || existing?.status === 'COMPLETED') {
    return Response.json(
      { error: 'ALREADY_SUBMITTED', reportId: existing.id },
      { status: 409 }
    )
  }

  const totalEnrolled = body.memberGrades.length
  const totalAbsent = Math.max(0, totalEnrolled - body.totalMembersPresent)

  const reportData = {
    reportMonth: body.reportMonth,
    reportYear: body.reportYear,
    status: body.status as 'DRAFT' | 'SUBMITTED',
    hodName: hodProfile.hodName,
    assistantOne: body.assistantOne?.trim() || null,
    assistantTwo: body.assistantTwo?.trim() || null,
    totalMembersEnrolled: totalEnrolled,
    totalMembersPresent: body.totalMembersPresent,
    totalMembersAbsent: totalAbsent,
    generalObservations: body.generalObservations?.trim() || null,
    challengesEncountered: body.challengesEncountered?.trim() || null,
    submittedAt: body.status === 'SUBMITTED' ? new Date() : null,
    hodProfileId: hodProfile.id,
    serviceTeamId: body.teamId,
    createdById: session.user.id,
  }

  let report
  if (existing) {
    report = await prisma.hodReport.update({
      where: { id: existing.id },
      data: reportData,
    })
    await prisma.reportMemberGrade.deleteMany({ where: { reportId: existing.id } })
  } else {
    report = await prisma.hodReport.create({ data: reportData })
  }

  // Create member grades
  await prisma.reportMemberGrade.createMany({
    data: body.memberGrades.map((mg) => {
      const gradeRecord = {
        generalAttitude: mg.generalAttitude,
        teamwork: mg.teamwork,
        punctuality: mg.punctuality,
        appearance: mg.appearance,
        attendance: mg.attendance,
      }
      const avg = computeAverageScore(gradeRecord)
      return {
        reportId: report.id,
        memberId: mg.memberId,
        generalAttitude: mg.generalAttitude as Grade,
        teamwork: mg.teamwork as Grade,
        punctuality: mg.punctuality as Grade,
        appearance: mg.appearance as Grade,
        attendance: mg.attendance as Grade,
        averageScore: avg,
      }
    }),
  })

  // Activity log
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: body.status === 'SUBMITTED' ? 'REPORT_SUBMITTED' : 'REPORT_SAVED_DRAFT',
      description: `HOD "${hodProfile.hodName}" ${body.status === 'SUBMITTED' ? 'submitted' : 'saved draft of'} report for team "${team.name}" — ${body.reportMonth}/${body.reportYear}`,
      entityType: 'HodReport',
      entityId: report.id,
    },
  }).catch(() => null)

  // Email notification
  if (body.status === 'SUBMITTED') {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    notifyEvent('HOD_REPORT_SUBMITTED', {
      teamName: team.name,
      month: `${MONTHS[body.reportMonth - 1]} ${body.reportYear}`,
      hodName: hodProfile.hodName,
      reportId: report.id,
    }).catch(() => null)
  }

  return Response.json({ id: report.id, status: report.status }, { status: existing ? 200 : 201 })
}

// ─── GET /api/reports ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const month = url.searchParams.get('month')
  const year = url.searchParams.get('year')
  const status = url.searchParams.get('status')
  const teamId = url.searchParams.get('teamId')
  const full = url.searchParams.get('full') === 'true'

  const where: Record<string, unknown> = {}
  if (month) where.reportMonth = parseInt(month)
  if (year) where.reportYear = parseInt(year)
  if (status) where.status = status
  if (teamId) where.serviceTeamId = teamId

  const roles = session.user.roles

  try {
    if (roles.includes('HOD')) {
      const hodProfile = await prisma.hodProfile.findUnique({
        where: { userId: session.user.id },
      })
      if (!hodProfile) return Response.json([])
      where.hodProfileId = hodProfile.id
    } else if (roles.includes('SUPERVISOR_PASTOR')) {
      const pastorProfile = await prisma.pastorProfile.findUnique({
        where: { userId: session.user.id },
        include: { serviceTeams: { select: { id: true } } },
      })
      if (!pastorProfile) return Response.json([])
      const teamIds = pastorProfile.serviceTeams.map((t) => t.id)
      where.serviceTeamId = { in: teamIds }
    }
    // ADMIN and HEAD_OF_SUPERVISOR see everything

    const reports = await prisma.hodReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        serviceTeam: { select: { id: true, name: true } },
        hodProfile: { select: { id: true, hodName: true } },
        ...(full
          ? {
              memberGrades: {
                include: { member: { select: { id: true, fullName: true } } },
              },
            }
          : {}),
      },
    })

    return Response.json(reports)
  } catch (err) {
    console.error('[GET /api/reports]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
