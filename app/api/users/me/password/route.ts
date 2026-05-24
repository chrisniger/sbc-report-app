import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  const valid = await bcrypt.compare(body.currentPassword, user.passwordHash)
  if (!valid) return Response.json({ error: 'Current password is incorrect' }, { status: 400 })

  if (body.newPassword === body.currentPassword) {
    return Response.json({ error: 'New password must differ from current password' }, { status: 400 })
  }

  const hash = await bcrypt.hash(body.newPassword, 12)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: hash, mustChangePassword: false },
  })

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: 'PASSWORD_CHANGED',
      description: `User "${user.username}" set a new password`,
      entityType: 'User',
      entityId: session.user.id,
    },
  }).catch(() => null)

  return Response.json({ ok: true })
}
