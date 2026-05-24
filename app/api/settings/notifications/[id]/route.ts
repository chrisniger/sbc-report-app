import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const patchSchema = z.object({
  event: z.string().min(1).optional(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional().nullable(),
  serviceTeamId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

// ─── PATCH /api/settings/notifications/[id] ───────────────────────────────

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
  } catch (err) {
    console.error('[PATCH /api/settings/notifications/:id] validation:', err)
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (body.event) updateData.event = body.event
  if (body.recipientEmail) updateData.recipientEmail = body.recipientEmail.trim()
  if (body.recipientName !== undefined) updateData.recipientName = body.recipientName?.trim() || null
  if (body.serviceTeamId !== undefined) updateData.serviceTeamId = body.serviceTeamId?.trim() || null
  if (body.isActive !== undefined) updateData.isActive = body.isActive

  try {
    await prisma.notificationSetting.update({ where: { id }, data: updateData })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/settings/notifications/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/settings/notifications/[id] ──────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    await prisma.notificationSetting.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/settings/notifications/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
