import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import nodemailer from 'nodemailer'

// ─── POST /api/settings/smtp/test ─────────────────────────────────────────

export async function POST() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const settings = await prisma.smtpSettings.findFirst()
  if (!settings) {
    return Response.json({ success: false, message: 'No SMTP settings configured' })
  }

  const toEmail = session.user.email
  if (!toEmail) {
    return Response.json({ success: false, message: 'Admin account has no email address on file' })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.username, pass: settings.password },
    })

    await transporter.verify()
    await transporter.sendMail({
      from: settings.fromDisplay,
      to: toEmail,
      subject: 'SBC Reports — SMTP Test',
      text: 'This is a test email from SBC Reports. Your SMTP configuration is working correctly.',
    })

    return Response.json({ success: true, message: `Test email sent to ${toEmail}` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ success: false, message: msg })
  }
}
