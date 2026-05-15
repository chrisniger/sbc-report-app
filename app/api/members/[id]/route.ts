import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const updateMemberSchema = z.object({
  firstName: z.string().min(1, 'Required').optional(),
  lastName: z.string().min(1, 'Required').optional(),
  phone: z.string().min(7, 'Valid phone required').optional(),
  homeLocation: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})

// ─── PATCH /api/members/[id] ───────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: z.infer<typeof updateMemberSchema>
  try {
    body = updateMemberSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const member = await prisma.serviceTeamMember.findUnique({ where: { id } })
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 })

  if (body.phone && body.phone !== member.phone) {
    const existing = await prisma.serviceTeamMember.findUnique({ where: { phone: body.phone } })
    if (existing) return Response.json({ error: 'Phone number already in use' }, { status: 409 })
  }

  const firstName = body.firstName?.trim() ?? member.firstName
  const lastName = body.lastName?.trim() ?? member.lastName
  const fullName = `${firstName} ${lastName}`

  try {
    await prisma.serviceTeamMember.update({
      where: { id },
      data: {
        firstName,
        lastName,
        fullName,
        phone: body.phone?.trim() ?? member.phone,
        homeLocation: body.homeLocation?.trim() || null,
        email: body.email?.trim() || null,
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'MEMBER_UPDATED',
        description: `Admin updated member "${fullName}"`,
        entityType: 'ServiceTeamMember',
        entityId: id,
      },
    }).catch(() => null)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/members/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
