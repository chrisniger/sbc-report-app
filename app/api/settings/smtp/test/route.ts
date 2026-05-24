import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import nodemailer from 'nodemailer'

type SmtpSettingsForTest = {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  fromDisplay: string
}

type SmtpFailure = {
  success: false
  message: string
  code: string
  details: {
    host: string
    port: number
    secure: boolean
    username: string
  }
}

export async function POST() {
  const session = await auth()
  if (!session || !session.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let smtp: SmtpSettingsForTest | null = null

  try {
    smtp = await prisma.smtpSettings.findFirst()
    if (!smtp) {
      return NextResponse.json(
        {
          success: false,
          message: 'No SMTP settings found. Save settings first.',
          code: 'SMTP_SETTINGS_MISSING',
        },
        { status: 400 }
      )
    }

    const configFailure = getConfigFailure(smtp)
    if (configFailure) {
      console.warn('[SMTP test] configuration warning', configFailure.details)
      return NextResponse.json(configFailure)
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
    })

    try {
      await transporter.verify()
    } catch (verifyErr) {
      const failure = buildSmtpFailure(verifyErr, smtp)
      console.error('[SMTP test] verify failed', logSafeFailure(failure))
      return NextResponse.json(failure)
    }

    try {
      await transporter.sendMail({
        from: smtp.fromDisplay,
        to: session.user.email ?? smtp.username,
        subject: 'SBC Report App - SMTP Test Email',
        html: buildTestEmailHtml(smtp),
      })
    } catch (sendErr) {
      const failure = buildSmtpFailure(sendErr, smtp)
      console.error('[SMTP test] send failed', logSafeFailure(failure))
      return NextResponse.json(failure)
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${session.user.email ?? smtp.username}`,
    })
  } catch (error) {
    const failure = smtp
      ? buildSmtpFailure(error, smtp)
      : {
          success: false,
          message: 'SMTP test failed because the server could not load the saved settings.',
          code: 'SMTP_TEST_FAILED',
        }

    console.error(
      '[SMTP test] unexpected failure',
      smtp ? logSafeFailure(failure as SmtpFailure) : failure
    )

    return NextResponse.json(failure, { status: 500 })
  }
}

function getConfigFailure(smtp: SmtpSettingsForTest): SmtpFailure | null {
  if (smtp.port === 465 && !smtp.secure) {
    return {
      success: false,
      message: 'SMTP configuration mismatch: port 465 usually requires secure SSL/TLS.',
      code: 'SMTP_PORT_SECURE_MISMATCH',
      details: safeDetails(smtp),
    }
  }

  if (smtp.port === 587 && smtp.secure) {
    return {
      success: false,
      message: 'SMTP configuration mismatch: port 587 usually uses STARTTLS with secure set to false.',
      code: 'SMTP_PORT_SECURE_MISMATCH',
      details: safeDetails(smtp),
    }
  }

  return null
}

function buildSmtpFailure(error: unknown, smtp: SmtpSettingsForTest): SmtpFailure {
  const code = getErrorCode(error)
  const message = getSafeMessage(error, smtp)

  return {
    success: false,
    message: classifyMessage(code, message, smtp),
    code,
    details: safeDetails(smtp),
  }
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'SMTP_TEST_FAILED'

  const record = error as Record<string, unknown>
  const code = record.code ?? record.responseCode ?? record.command

  return typeof code === 'string' || typeof code === 'number'
    ? String(code)
    : 'SMTP_TEST_FAILED'
}

function getSafeMessage(error: unknown, smtp: SmtpSettingsForTest): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown SMTP error'

  return sanitizeMessage(raw, [smtp.username, smtp.password])
}

function classifyMessage(
  code: string,
  safeMessage: string,
  smtp: SmtpSettingsForTest
): string {
  if (code === 'EAUTH' || /auth|credential|password|login/i.test(safeMessage)) {
    const gmailHint = /gmail|google/i.test(smtp.host)
      ? ' Gmail/Google accounts require an app password, not the normal account password.'
      : ''
    return `SMTP authentication failed.${gmailHint}`
  }

  if (code === 'ECONNECTION' || code === 'ETIMEDOUT' || /timeout|connect/i.test(safeMessage)) {
    return `Could not connect to SMTP server at ${smtp.host}:${smtp.port}. Check the host, port, and secure setting.`
  }

  if (/certificate|tls|ssl|self-signed/i.test(safeMessage)) {
    return 'SMTP TLS certificate validation failed. Check the SMTP host name and provider TLS settings.'
  }

  return safeMessage ? `SMTP test failed: ${safeMessage}` : 'SMTP test failed.'
}

function sanitizeMessage(message: string, secrets: string[]): string {
  let safe = message

  for (const secret of secrets) {
    if (secret) safe = safe.split(secret).join('[redacted]')
  }

  return safe.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    (email) => maskEmail(email)
  )
}

function safeDetails(smtp: SmtpSettingsForTest) {
  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    username: maskEmail(smtp.username),
  }
}

function logSafeFailure(failure: SmtpFailure) {
  return {
    host: failure.details.host,
    port: failure.details.port,
    secure: failure.details.secure,
    username: failure.details.username,
    code: failure.code,
    message: failure.message,
  }
}

function maskEmail(value: string): string {
  const [local, domain] = value.split('@')

  if (!domain) {
    return value.length <= 3 ? '***' : `${value.slice(0, 2)}***`
  }

  const visibleLocal =
    local.length <= 2 ? `${local.slice(0, 1)}***` : `${local.slice(0, 2)}***${local.slice(-1)}`

  return `${visibleLocal}@${domain}`
}

function buildTestEmailHtml(smtp: SmtpSettingsForTest) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#C8102E;padding:24px;text-align:center;">
        <h1 style="color:#ffffff;font-size:28px;margin:0;">
          THE SUMMIT BIBLE CHURCH
        </h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">
          Report System - SMTP Test
        </p>
      </div>
      <div style="padding:32px;background:#ffffff;border:1px solid #e8e8e8;">
        <h2 style="color:#111111;">SMTP Connection Successful</h2>
        <p style="color:#555;line-height:1.6;">
          Your SMTP settings are configured correctly.
          The SBC Report App can send emails successfully.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr>
            <td style="padding:8px;background:#f5f5f5;font-weight:600;
                width:40%;color:#333;">Host</td>
            <td style="padding:8px;color:#555;">${smtp.host}</td>
          </tr>
          <tr>
            <td style="padding:8px;background:#f5f5f5;font-weight:600;
                color:#333;">Port</td>
            <td style="padding:8px;color:#555;">${smtp.port}</td>
          </tr>
          <tr>
            <td style="padding:8px;background:#f5f5f5;font-weight:600;
                color:#333;">Encryption</td>
            <td style="padding:8px;color:#555;">
              ${smtp.secure ? 'SSL' : 'STARTTLS/None'}
            </td>
          </tr>
          <tr>
            <td style="padding:8px;background:#f5f5f5;font-weight:600;
                color:#333;">From</td>
            <td style="padding:8px;color:#555;">${smtp.fromDisplay}</td>
          </tr>
        </table>
      </div>
      <div style="padding:16px;text-align:center;background:#f5f5f5;">
        <p style="color:#999;font-size:12px;margin:0;">
          This is an automated test email from SBC Report App
        </p>
      </div>
    </div>
  `
}
