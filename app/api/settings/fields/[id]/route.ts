import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const patchSchema = z.object({
  fieldLabel: z.string().min(1).optional(),
  fieldType: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox', 'number']).optional(),
  fieldOptions: z.string().optional().nullable(),
  isRequired: z.boolean().optional(),
  visibleToRoles: z.array(z.string()).optional(),
  fieldOrder: z.number().int().optional(),
})

// ─── PATCH /api/settings/fields/[id] ──────────────────────────────────────

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
    console.error('[PATCH /api/settings/fields/:id] validation:', err)
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const field = await prisma.customFormField.findUnique({ where: { id } })
  if (!field) return Response.json({ error: 'Field not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {}
  if (body.fieldLabel) updateData.fieldLabel = body.fieldLabel.trim()
  if (body.fieldType) updateData.fieldType = body.fieldType
  if (body.fieldOptions !== undefined) updateData.fieldOptions = body.fieldOptions?.trim() || null
  if (body.isRequired !== undefined) updateData.isRequired = body.isRequired
  if (body.visibleToRoles !== undefined) updateData.visibleToRoles = JSON.stringify(body.visibleToRoles)
  if (body.fieldOrder !== undefined) updateData.fieldOrder = body.fieldOrder

  try {
    await prisma.customFormField.update({ where: { id }, data: updateData })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/settings/fields/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/settings/fields/[id] ─────────────────────────────────────

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
    await prisma.customFormField.update({ where: { id }, data: { isActive: false } })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/settings/fields/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
