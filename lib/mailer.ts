import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'

// ─────────────────────────────────────────────
// Transport factory
// ─────────────────────────────────────────────

async function createTransporter() {
  const settings = await prisma.smtpSettings.findFirst()
  if (!settings) throw new Error('No SMTP settings configured in the database')

  return {
    transporter: nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.username,
        pass: settings.password,
      },
    }),
    from: settings.fromDisplay,
  }
}

// ─────────────────────────────────────────────
// Core sendMail
// ─────────────────────────────────────────────

export async function sendMail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[]
  subject: string
  html?: string
  text?: string
}) {
  const { transporter, from } = await createTransporter()
  return transporter.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text,
  })
}

// ─────────────────────────────────────────────
// HTML template builder
// ─────────────────────────────────────────────

function buildHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#C8102E;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#ffffff;letter-spacing:6px;">SBC</span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">Report System</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9f9;border-top:1px solid #e8e8e8;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#999999;">The Summit Bible Church — Service Team Report System</p>
              <p style="margin:4px 0 0;font-size:11px;color:#bbbbbb;">This is an automated notification. Do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─────────────────────────────────────────────
// Event-driven notifications
// ─────────────────────────────────────────────

export type MailEvent =
  | 'HOD_REPORT_SUBMITTED'
  | 'PASTOR_REVIEW_COMPLETED'
  | 'HEAD_REVIEW_COMPLETED'

export interface MailContext {
  teamName?: string
  month?: string
  hodName?: string
  pastorName?: string
  reportId?: string
  recipientName?: string
}

export async function notifyEvent(event: MailEvent, ctx: MailContext = {}) {
  const recipients = await prisma.notificationSetting.findMany({
    where: { event, isActive: true },
  })
  if (!recipients.length) return

  const subject = buildSubject(event, ctx)
  const html = buildHtmlBody(event, ctx)
  const text = buildTextBody(event, ctx)

  await Promise.allSettled(
    recipients.map((r) =>
      sendMail({
        to: r.recipientEmail,
        subject,
        html: buildHtml(subject, html),
        text,
      }).catch((err) =>
        console.error(`[mailer] failed to send ${event} to ${r.recipientEmail}:`, err)
      )
    )
  )
}

// ─────────────────────────────────────────────
// Welcome email (for newly created users)
// ─────────────────────────────────────────────

export async function sendWelcomeEmail({
  to,
  recipientName,
  username,
  temporaryPassword,
}: {
  to: string
  recipientName: string
  username: string
  temporaryPassword: string
}) {
  const subject = 'Welcome to the SBC Report System'
  const bodyHtml = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111111;">Welcome, ${recipientName}!</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
      An account has been created for you on the SBC Service Team Report System.
      Use the credentials below to sign in for the first time.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;border:1px solid #e8e8e8;border-radius:4px;padding:16px;margin-bottom:24px;">
      <tr>
        <td style="padding:6px 0;">
          <span style="font-size:12px;color:#999999;text-transform:uppercase;letter-spacing:1px;">Username</span><br/>
          <strong style="font-size:15px;color:#111111;">${username}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;">
          <span style="font-size:12px;color:#999999;text-transform:uppercase;letter-spacing:1px;">Temporary Password</span><br/>
          <strong style="font-size:15px;color:#C8102E;">${temporaryPassword}</strong>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#777777;line-height:1.6;">
      You will be required to set a new password when you first log in.
    </p>
    <p style="margin:0;font-size:12px;color:#aaaaaa;">
      If you did not expect this email, please contact your system administrator.
    </p>`

  await sendMail({
    to,
    subject,
    html: buildHtml(subject, bodyHtml),
    text: [
      `Welcome, ${recipientName}!`,
      '',
      'An account has been created for you on the SBC Service Team Report System.',
      '',
      `Username          : ${username}`,
      `Temporary Password: ${temporaryPassword}`,
      '',
      'You will be required to set a new password on first login.',
    ].join('\n'),
  })
}

// ─────────────────────────────────────────────
// Deadline reminder email (sent to HOD)
// ─────────────────────────────────────────────

export async function sendDeadlineReminder({
  to,
  recipientName,
  teamName,
  month,
  deadline,
}: {
  to: string
  recipientName: string
  teamName: string
  month: string
  deadline: string
}) {
  const subject = `Reminder: ${month} Report Due — ${teamName}`
  const bodyHtml = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111111;">Report Deadline Reminder</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
      Dear ${recipientName}, this is a reminder that your monthly report is due soon.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff8f8;border:1px solid #f5c0c0;border-radius:4px;padding:16px;margin-bottom:24px;">
      <tr>
        <td style="padding:4px 0;">
          <span style="font-size:12px;color:#999999;text-transform:uppercase;letter-spacing:1px;">Service Team</span><br/>
          <strong style="font-size:14px;color:#111111;">${teamName}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0;">
          <span style="font-size:12px;color:#999999;text-transform:uppercase;letter-spacing:1px;">Report Period</span><br/>
          <strong style="font-size:14px;color:#111111;">${month}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0;">
          <span style="font-size:12px;color:#999999;text-transform:uppercase;letter-spacing:1px;">Deadline</span><br/>
          <strong style="font-size:14px;color:#C8102E;">${deadline}</strong>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#777777;">
      Please log in to the SBC Report System and submit your report before the deadline.
    </p>`

  await sendMail({
    to,
    subject,
    html: buildHtml(subject, bodyHtml),
    text: [
      `Report Deadline Reminder — ${teamName}`,
      '',
      `Dear ${recipientName},`,
      '',
      'This is a reminder that your monthly report is due soon.',
      '',
      `Service Team : ${teamName}`,
      `Period       : ${month}`,
      `Deadline     : ${deadline}`,
      '',
      'Please log in and submit your report before the deadline.',
    ].join('\n'),
  })
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

function buildSubject(event: MailEvent, ctx: MailContext): string {
  const period = ctx.month ? ` (${ctx.month})` : ''
  const team = ctx.teamName ? ` — ${ctx.teamName}` : ''
  switch (event) {
    case 'HOD_REPORT_SUBMITTED':
      return `HOD Report Submitted${team}${period}`
    case 'PASTOR_REVIEW_COMPLETED':
      return `Pastor Review Completed${team}${period}`
    case 'HEAD_REVIEW_COMPLETED':
      return `Head Review Completed${team}${period}`
  }
}

function buildHtmlBody(event: MailEvent, ctx: MailContext): string {
  const greeting = ctx.recipientName ? `<p style="margin:0 0 16px;font-size:14px;color:#555555;">Dear ${ctx.recipientName},</p>` : ''

  switch (event) {
    case 'HOD_REPORT_SUBMITTED':
      return `
        <h2 style="margin:0 0 8px;font-size:20px;color:#111111;">New HOD Report Submitted</h2>
        ${greeting}
        <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
          A monthly report has been submitted and is awaiting your review.
        </p>
        ${buildInfoTable([
          ['Service Team', ctx.teamName],
          ['Period', ctx.month],
          ['Head of Department', ctx.hodName],
        ])}
        <p style="margin:16px 0 0;font-size:13px;color:#777777;">
          Please log in to the SBC Report System to review and process this report.
        </p>`

    case 'PASTOR_REVIEW_COMPLETED':
      return `
        <h2 style="margin:0 0 8px;font-size:20px;color:#111111;">Pastor Review Completed</h2>
        ${greeting}
        <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
          A supervisor pastor has completed their review of an HOD report.
        </p>
        ${buildInfoTable([
          ['Service Team', ctx.teamName],
          ['Period', ctx.month],
          ['Supervisor Pastor', ctx.pastorName],
        ])}
        <p style="margin:16px 0 0;font-size:13px;color:#777777;">
          Log in to view the pastor&rsquo;s review and submit your head review.
        </p>`

    case 'HEAD_REVIEW_COMPLETED':
      return `
        <h2 style="margin:0 0 8px;font-size:20px;color:#111111;">Head Review Completed</h2>
        ${greeting}
        <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
          The head of supervisor has completed their review of the following report.
        </p>
        ${buildInfoTable([
          ['Service Team', ctx.teamName],
          ['Period', ctx.month],
        ])}
        <p style="margin:16px 0 0;font-size:13px;color:#777777;">
          Log in to view the completed review.
        </p>`
  }
}

function buildInfoTable(rows: [string, string | undefined][]): string {
  const cells = rows
    .filter(([, v]) => v)
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eeeeee;">
          <span style="font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:1px;">${label}</span><br/>
          <strong style="font-size:14px;color:#111111;">${value}</strong>
        </td>
      </tr>`
    )
    .join('')

  return `<table width="100%" cellpadding="0" cellspacing="0"
    style="background-color:#f9f9f9;border:1px solid #e8e8e8;border-radius:4px;padding:16px;margin-bottom:8px;">
    ${cells}
  </table>`
}

function buildTextBody(event: MailEvent, ctx: MailContext): string {
  switch (event) {
    case 'HOD_REPORT_SUBMITTED':
      return [
        'A new HOD report has been submitted.',
        '',
        `Service Team : ${ctx.teamName ?? 'N/A'}`,
        `Period       : ${ctx.month ?? 'N/A'}`,
        `HOD          : ${ctx.hodName ?? 'N/A'}`,
      ].join('\n')
    case 'PASTOR_REVIEW_COMPLETED':
      return [
        'A supervisor pastor review has been completed.',
        '',
        `Service Team : ${ctx.teamName ?? 'N/A'}`,
        `Period       : ${ctx.month ?? 'N/A'}`,
        `Pastor       : ${ctx.pastorName ?? 'N/A'}`,
      ].join('\n')
    case 'HEAD_REVIEW_COMPLETED':
      return [
        'A head-of-supervisor review has been completed.',
        '',
        `Service Team : ${ctx.teamName ?? 'N/A'}`,
        `Period       : ${ctx.month ?? 'N/A'}`,
      ].join('\n')
  }
}
