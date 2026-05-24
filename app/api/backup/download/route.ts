import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ─── GET /api/backup/download ──────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [
      users,
      serviceTeams,
      serviceTeamMembers,
      memberAssignments,
      hodReports,
      reportMemberGrades,
      pastorReviews,
      headReviews,
      smtpSettings,
      notificationSettings,
      customFormFields,
      reportPeriods,
    ] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.serviceTeam.findMany({ orderBy: { name: 'asc' } }),
      prisma.serviceTeamMember.findMany({ orderBy: { fullName: 'asc' } }),
      prisma.serviceTeamMemberAssignment.findMany(),
      prisma.hodReport.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.reportMemberGrade.findMany(),
      prisma.pastorReview.findMany(),
      prisma.headReview.findMany(),
      prisma.smtpSettings.findFirst(),
      prisma.notificationSetting.findMany(),
      prisma.customFormField.findMany({ orderBy: { fieldOrder: 'asc' } }),
      prisma.reportPeriod.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
    ])

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        users: users.map(({ passwordHash: _pw, ...u }) => u),
        serviceTeams,
        serviceTeamMembers,
        memberAssignments,
        hodReports,
        reportMemberGrades,
        pastorReviews,
        headReviews,
        smtpSettings: smtpSettings
          ? { ...smtpSettings, password: '[REDACTED]' }
          : null,
        notificationSettings,
        customFormFields,
        reportPeriods,
      },
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'BACKUP_DOWNLOADED',
        description: 'Admin downloaded full system backup',
      },
    }).catch(() => null)

    const date = new Date().toISOString().split('T')[0]
    const json = JSON.stringify(backup, null, 2)

    return new Response(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="sbc-backup-${date}.json"`,
      },
    })
  } catch (err) {
    console.error('[GET /api/backup/download]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
