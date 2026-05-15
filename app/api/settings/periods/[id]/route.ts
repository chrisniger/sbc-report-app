import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const patchSchema = z.object({
  deadline: z.string().optional().or(z.literal('')),
  isLocked: z.boolean().optional(),
  autoReminders: z.boolean().optional(),
})

// ─── PATCH /api/settings/periods/[id] ─────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const period = await prisma.reportPeriod.findUnique({ where: { id } })
  if (!period) return Response.json({ error: 'Period not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {}
  if (body.deadline !== undefined) {
    updateData.deadline = body.deadline ? new Date(body.deadline) : null
  }
  if (body.isLocked !== undefined) updateData.isLocked = body.isLocked
  if (body.autoReminders !== undefined) updateData.autoReminders = body.autoReminders

  try {
    await prisma.reportPeriod.update({ where: { id }, data: updateData })

    if (body.isLocked !== undefined) {
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: body.isLocked ? 'PERIOD_LOCKED' : 'PERIOD_UNLOCKED',
          description: `Admin ${body.isLocked ? 'locked' : 'unlocked'} report period ${MONTHS[period.month - 1]} ${period.year}`,
          entityType: 'ReportPeriod',
          entityId: id,
        },
      }).catch(() => null)
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/settings/periods/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
