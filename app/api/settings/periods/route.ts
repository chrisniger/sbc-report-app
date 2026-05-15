import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const periodSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024).max(2035),
  deadline: z.string().optional().or(z.literal('')),
  isLocked: z.boolean().optional(),
  autoReminders: z.boolean().optional(),
})

// ─── GET /api/settings/periods ─────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const periods = await prisma.reportPeriod.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    return Response.json(
      periods.map((p) => ({
        ...p,
        deadline: p.deadline?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))
    )
  } catch (err) {
    console.error('[GET /api/settings/periods]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/settings/periods ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof periodSchema>
  try {
    body = periodSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const existing = await prisma.reportPeriod.findUnique({
    where: { month_year: { month: body.month, year: body.year } },
  })
  if (existing) return Response.json({ error: 'Period already exists' }, { status: 409 })

  try {
    const period = await prisma.reportPeriod.create({
      data: {
        month: body.month,
        year: body.year,
        deadline: body.deadline ? new Date(body.deadline) : null,
        isLocked: body.isLocked ?? false,
        autoReminders: body.autoReminders ?? true,
      },
    })
    return Response.json(
      { id: period.id, deadline: period.deadline?.toISOString() ?? null },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/settings/periods]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
