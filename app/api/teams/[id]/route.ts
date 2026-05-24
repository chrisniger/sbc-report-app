import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().or(z.literal('')),
  hodId: z.string().optional().or(z.literal('')),
  pastorId: z.string().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

// ─── PATCH /api/teams/[id] ─────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: z.infer<typeof updateTeamSchema>
  try {
    body = updateTeamSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const team = await prisma.serviceTeam.findUnique({ where: { id } })
  if (!team) return Response.json({ error: 'Team not found' }, { status: 404 })

  if (body.name && body.name.trim() !== team.name) {
    const existing = await prisma.serviceTeam.findUnique({ where: { name: body.name.trim() } })
    if (existing) return Response.json({ error: 'Team name already exists' }, { status: 409 })
  }

  const updateData: Record<string, unknown> = {}
  if (body.name) updateData.name = body.name.trim()
  if (body.description !== undefined) updateData.description = body.description?.trim() || null
  if (body.hodId !== undefined) updateData.hodId = body.hodId?.trim() || null
  if (body.pastorId !== undefined) updateData.pastorId = body.pastorId?.trim() || null
  if (body.isActive !== undefined) updateData.isActive = body.isActive

  try {
    await prisma.serviceTeam.update({ where: { id }, data: updateData })

    const changes: string[] = []
    if (body.hodId !== undefined) changes.push(`HOSTs reassigned`)
    if (body.pastorId !== undefined) changes.push(`Pastor reassigned`)
    if (body.name) changes.push(`renamed to "${body.name}"`)
    if (body.isActive !== undefined) changes.push(body.isActive ? 'reactivated' : 'deactivated')

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'TEAM_UPDATED',
        description: `Admin updated team "${team.name}": ${changes.join(', ') || 'fields updated'}`,
        entityType: 'ServiceTeam',
        entityId: id,
      },
    }).catch(() => null)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/teams/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
