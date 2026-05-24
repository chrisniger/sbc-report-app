import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/mailer'

const updateUserSchema = z.object({
  firstName: z.string().min(1, 'Required').optional(),
  lastName: z.string().min(1, 'Required').optional(),
  username: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(8).optional().or(z.literal('')),
  roles: z.array(z.enum(['ADMIN', 'PASTOR', 'HEAD_OF_SUPERVISOR', 'SUPERVISOR_PASTOR', 'HOD'])).min(1).optional(),
  teamIds: z.array(z.string()).optional(),
  supervisorId: z.string().optional().or(z.literal('')),
  headId: z.string().optional().or(z.literal('')),
  resetPassword: z.boolean().optional(),
})

// ─── PATCH /api/users/[id] ─────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: z.infer<typeof updateUserSchema>
  try {
    body = updateUserSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id },
    include: { hodProfile: true, pastorProfile: true, headProfile: true },
  })
  if (!target) return Response.json({ error: 'User not found' }, { status: 404 })

  // Cannot remove own ADMIN role or change own username
  const isSelf = session.user.id === id
  if (isSelf && body.roles && !body.roles.includes('ADMIN')) {
    return Response.json({ error: 'Cannot remove your own ADMIN role' }, { status: 400 })
  }
  if (isSelf && body.username && body.username !== target.username) {
    return Response.json({ error: 'Cannot change your own username' }, { status: 400 })
  }

  const email = body.email?.trim() || null
  const phone = body.phone?.trim() || null

  // Check uniqueness for changed fields
  if (body.username && body.username !== target.username) {
    const existing = await prisma.user.findUnique({ where: { username: body.username } })
    if (existing) return Response.json({ error: 'Username already taken' }, { status: 409 })
  }
  if (email && email !== target.email) {
    const existing = await prisma.user.findFirst({ where: { email, NOT: { id } } })
    if (existing) return Response.json({ error: 'Email already in use' }, { status: 409 })
  }
  if (phone && phone !== target.phone) {
    const existing = await prisma.user.findFirst({ where: { phone, NOT: { id } } })
    if (existing) return Response.json({ error: 'Phone already in use' }, { status: 409 })
  }

  let tempPassword: string | null = null

  try {
    await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {}
      if (body.firstName) updateData.firstName = body.firstName.trim()
      if (body.lastName) updateData.lastName = body.lastName.trim()
      if (body.username) updateData.username = body.username.trim()
      if (email !== undefined) updateData.email = email
      if (phone !== undefined) updateData.phone = phone

      if (body.roles) updateData.roles = body.roles

      if (body.password) {
        updateData.passwordHash = await bcrypt.hash(body.password, 12)
        updateData.mustChangePassword = true
      }

      if (body.resetPassword) {
        tempPassword = Math.random().toString(36).slice(2, 10) + 'A1!'
        updateData.passwordHash = await bcrypt.hash(tempPassword, 12)
        updateData.mustChangePassword = true
      }

      if (Object.keys(updateData).length > 0) {
        await tx.user.update({ where: { id }, data: updateData })
      }

      const displayName = [
        body.firstName?.trim() ?? target.firstName,
        body.lastName?.trim() ?? target.lastName,
      ].join(' ')

      const newRoles = body.roles ?? (target.roles as string[])

      // HOD profile management
      if (newRoles.includes('HOD')) {
        if (!target.hodProfile) {
          await tx.hodProfile.create({
            data: {
              userId: id,
              hodName: displayName,
              supervisorId: body.supervisorId?.trim() || null,
              ...(body.teamIds?.length
                ? { serviceTeams: { connect: body.teamIds.map((tid) => ({ id: tid })) } }
                : {}),
            },
          })
        } else {
          const hodUpdate: Record<string, unknown> = { hodName: displayName }
          if (body.supervisorId !== undefined) hodUpdate.supervisorId = body.supervisorId?.trim() || null
          await tx.hodProfile.update({ where: { userId: id }, data: hodUpdate })
          if (body.teamIds !== undefined) {
            await tx.hodProfile.update({
              where: { userId: id },
              data: { serviceTeams: { set: body.teamIds.map((tid) => ({ id: tid })) } },
            })
          }
        }
      } else if (target.hodProfile && !newRoles.includes('HOD')) {
        await tx.hodProfile.delete({ where: { userId: id } })
      }

      // Pastor profile management
      if (newRoles.includes('SUPERVISOR_PASTOR')) {
        if (!target.pastorProfile) {
          await tx.pastorProfile.create({
            data: {
              userId: id,
              pastorName: displayName,
              headId: body.headId?.trim() || null,
            },
          })
        } else {
          const pastorUpdate: Record<string, unknown> = { pastorName: displayName }
          if (body.headId !== undefined) pastorUpdate.headId = body.headId?.trim() || null
          await tx.pastorProfile.update({ where: { userId: id }, data: pastorUpdate })
        }
      } else if (target.pastorProfile && !newRoles.includes('SUPERVISOR_PASTOR')) {
        await tx.pastorProfile.delete({ where: { userId: id } })
      }

      // Head profile management
      if (newRoles.includes('HEAD_OF_SUPERVISOR')) {
        if (!target.headProfile) {
          await tx.headOfSupervisorProfile.create({
            data: { userId: id, headName: displayName },
          })
        } else {
          await tx.headOfSupervisorProfile.update({
            where: { userId: id },
            data: { headName: displayName },
          })
        }
      } else if (target.headProfile && !newRoles.includes('HEAD_OF_SUPERVISOR')) {
        await tx.headOfSupervisorProfile.delete({ where: { userId: id } })
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_UPDATED',
        description: `Admin updated user "${target.username}"`,
        entityType: 'User',
        entityId: id,
      },
    }).catch(() => null)

    if (tempPassword && target.email) {
      sendWelcomeEmail({
        to: target.email,
        recipientName: target.firstName,
        username: target.username,
        temporaryPassword: tempPassword,
      }).catch(() => null)
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/users/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/users/[id] ────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  if (session.user.id === id) {
    return Response.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return Response.json({ error: 'User not found' }, { status: 404 })

  try {
    await prisma.user.update({ where: { id }, data: { isActive: false } })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_DEACTIVATED',
        description: `Admin deactivated user "${target.username}"`,
        entityType: 'User',
        entityId: id,
      },
    }).catch(() => null)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/users/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
