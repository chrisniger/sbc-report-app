import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import SettingsClient from '@/components/admin/SettingsClient'
import type { SmtpRecord, NotifRecord, PeriodRecord, FieldRecord, TeamOption } from '@/components/admin/SettingsClient'

async function getData() {
  const [smtpRaw, notifRaw, periodsRaw, fieldsRaw, teams] = await Promise.all([
    prisma.smtpSettings.findFirst(),
    prisma.notificationSetting.findMany({
      where: { event: { not: 'WHATSAPP_CONTACT' } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.reportPeriod.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
    prisma.customFormField.findMany({
      where: { isActive: true },
      orderBy: [{ formName: 'asc' }, { fieldOrder: 'asc' }],
    }),
    prisma.serviceTeam.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  type NotificationSource = (typeof notifRaw)[number]
  type NotificationTeam = { id: string; name: string }
  type PeriodSource = (typeof periodsRaw)[number]
  type FieldSource = (typeof fieldsRaw)[number]

  const teamIds = [...new Set(notifRaw.map((n: NotificationSource) => n.serviceTeamId).filter(Boolean))] as string[]
  const notifTeams =
    teamIds.length > 0
      ? await prisma.serviceTeam.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } })
      : []
  const teamMap = Object.fromEntries(notifTeams.map((t: NotificationTeam) => [t.id, t.name]))

  const smtp: SmtpRecord | null = smtpRaw
    ? {
        id: smtpRaw.id,
        host: smtpRaw.host,
        port: smtpRaw.port,
        secure: smtpRaw.secure,
        username: smtpRaw.username,
        password: smtpRaw.password.length >= 3 ? smtpRaw.password.slice(0, 3) + '***' : '***',
        fromDisplay: smtpRaw.fromDisplay,
        updatedAt: smtpRaw.updatedAt.toISOString(),
        updatedById: smtpRaw.updatedById,
      }
    : null

  const notifications: NotifRecord[] = notifRaw.map((n: NotificationSource) => ({
    ...n,
    serviceTeamName: n.serviceTeamId ? (teamMap[n.serviceTeamId] ?? null) : null,
    createdAt: n.createdAt.toISOString(),
  }))

  const periods: PeriodRecord[] = periodsRaw.map((p: PeriodSource) => ({
    ...p,
    deadline: p.deadline?.toISOString() ?? null,
    createdAt: undefined,
    updatedAt: undefined,
  })) as PeriodRecord[]

  const fields: FieldRecord[] = fieldsRaw.map((f: FieldSource) => ({
    ...f,
    createdAt: undefined,
    updatedAt: undefined,
  })) as FieldRecord[]

  const allTeams: TeamOption[] = teams

  return { smtp, notifications, periods, fields, allTeams }
}

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) redirect('/dashboard')

  const { smtp, notifications, periods, fields, allTeams } = await getData()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-sbc-black dark:text-white tracking-widest">
          SETTINGS & SMTP
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Configure email, notifications, report periods and form fields
        </p>
      </div>

      <SettingsClient
        smtp={smtp}
        notifications={notifications}
        periods={periods}
        fields={fields}
        teams={allTeams}
      />
    </div>
  )
}
