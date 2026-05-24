import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendDeadlineReminder } from '@/lib/mailer'

// ─── POST /api/settings/periods/[id]/remind ───────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const period = await prisma.reportPeriod.findUnique({ where: { id } })
  if (!period) return Response.json({ error: 'Period not found' }, { status: 404 })

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const periodLabel = `${MONTHS[period.month - 1]} ${period.year}`

  try {
    const [allHods, submitted] = await Promise.all([
      prisma.hodProfile.findMany({
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          serviceTeams: { select: { name: true }, take: 1 },
        },
      }),
      prisma.hodReport.findMany({
        where: { reportMonth: period.month, reportYear: period.year },
        select: { hodProfileId: true },
      }),
    ])

    const submittedIds = new Set(submitted.map((r) => r.hodProfileId))
    const pending = allHods.filter((h) => !submittedIds.has(h.id) && h.user.email)

    const deadlineStr = period.deadline
      ? new Date(period.deadline).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : 'End of month'

    const results = await Promise.allSettled(
      pending.map((h) =>
        sendDeadlineReminder({
          to: h.user.email!,
          recipientName: h.user.firstName,
          teamName: h.serviceTeams[0]?.name ?? h.hodName,
          month: periodLabel,
          deadline: deadlineStr,
        })
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const hodNames = pending.map((h) => `${h.user.firstName} ${h.user.lastName ?? ''}`.trim())

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'REMINDER_SENT',
        description: `Admin sent reminders for ${periodLabel} to ${sent} HOST(s): ${hodNames.join(', ')}`,
        entityType: 'ReportPeriod',
        entityId: id,
      },
    }).catch(() => null)

    return Response.json({ sent, hodNames })
  } catch (err) {
    console.error('[POST /api/settings/periods/:id/remind]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
