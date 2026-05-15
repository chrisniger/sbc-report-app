import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const fieldSchema = z.object({
  formName: z.enum(['HOD_REPORT', 'PASTOR_REVIEW', 'MEMBER_FORM']),
  fieldLabel: z.string().min(1, 'Required'),
  fieldType: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox', 'number']),
  fieldOptions: z.string().optional().or(z.literal('')),
  isRequired: z.boolean().optional(),
  visibleToRoles: z.array(z.string()).optional(),
  fieldOrder: z.number().int().optional(),
})

// ─── GET /api/settings/fields ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const form = url.searchParams.get('form')

  try {
    const fields = await prisma.customFormField.findMany({
      where: {
        isActive: true,
        ...(form ? { formName: form } : {}),
      },
      orderBy: [{ formName: 'asc' }, { fieldOrder: 'asc' }],
    })
    return Response.json(
      fields.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      }))
    )
  } catch (err) {
    console.error('[GET /api/settings/fields]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/settings/fields ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof fieldSchema>
  try {
    body = fieldSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const maxOrder = await prisma.customFormField.aggregate({
      where: { formName: body.formName, isActive: true },
      _max: { fieldOrder: true },
    })
    const nextOrder = (maxOrder._max.fieldOrder ?? 0) + 1

    const field = await prisma.customFormField.create({
      data: {
        formName: body.formName,
        fieldLabel: body.fieldLabel.trim(),
        fieldType: body.fieldType,
        fieldOptions: body.fieldOptions?.trim() || null,
        isRequired: body.isRequired ?? false,
        visibleToRoles: JSON.stringify(body.visibleToRoles ?? ['ADMIN', 'HEAD_OF_SUPERVISOR', 'SUPERVISOR_PASTOR', 'HOD']),
        fieldOrder: body.fieldOrder ?? nextOrder,
      },
    })
    return Response.json({ id: field.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/settings/fields]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
