import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const WHATSAPP_EVENT = 'WHATSAPP_CONTACT'
const DEFAULT_MESSAGE = 'Hello Admin, I need help with SBC Reporting System.'

const whatsappSchema = z.object({
  phone: z.string().optional().nullable(),
})

function normalizePhone(value: string | null | undefined) {
  const raw = (value ?? '').trim()
  if (!raw) return null

  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return `234${digits.slice(1)}`
  if (digits.length === 10) return `234${digits}`
  return digits
}

function buildContact(phone: string | null) {
  if (!phone) return { phone: null, href: null }
  return {
    phone,
    href: `https://wa.me/${phone}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`,
  }
}

async function getRecord() {
  return prisma.notificationSetting.findFirst({
    where: { event: WHATSAPP_EVENT },
    orderBy: { createdAt: 'desc' },
  })
}

export async function GET() {
  try {
    const record = await getRecord()
    const phone = record?.isActive ? normalizePhone(record.recipientEmail) : null
    return Response.json(buildContact(phone))
  } catch (err) {
    console.error('[GET /api/settings/whatsapp]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof whatsappSchema>
  try {
    body = whatsappSchema.parse(await request.json())
  } catch (err) {
    console.error('[PUT /api/settings/whatsapp] validation:', err)
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const phone = normalizePhone(body.phone)
  if (body.phone?.trim() && (!phone || phone.length < 10 || phone.length > 15)) {
    return Response.json({ error: 'Enter a valid WhatsApp number' }, { status: 400 })
  }

  try {
    const existing = await getRecord()

    if (existing) {
      await prisma.notificationSetting.update({
        where: { id: existing.id },
        data: {
          recipientEmail: phone ?? '',
          recipientName: 'Admin WhatsApp Contact',
          serviceTeamId: null,
          isActive: Boolean(phone),
        },
      })
    } else {
      await prisma.notificationSetting.create({
        data: {
          event: WHATSAPP_EVENT,
          recipientEmail: phone ?? '',
          recipientName: 'Admin WhatsApp Contact',
          serviceTeamId: null,
          isActive: Boolean(phone),
        },
      })
    }

    return Response.json(buildContact(phone))
  } catch (err) {
    console.error('[PUT /api/settings/whatsapp]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
