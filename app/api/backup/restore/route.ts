import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface BackupPayload {
  version: string
  exportedAt: string
  data: {
    serviceTeams?: unknown[]
    serviceTeamMembers?: unknown[]
    memberAssignments?: unknown[]
    hodReports?: unknown[]
    reportMemberGrades?: unknown[]
    pastorReviews?: unknown[]
    headReviews?: unknown[]
    notificationSettings?: unknown[]
    customFormFields?: unknown[]
    reportPeriods?: unknown[]
  }
}

function isBackupPayload(obj: unknown): obj is BackupPayload {
  if (!obj || typeof obj !== 'object') return false
  const b = obj as Record<string, unknown>
  return typeof b.version === 'string' && typeof b.exportedAt === 'string' && typeof b.data === 'object'
}

// ─── POST /api/backup/restore ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let payload: BackupPayload
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file uploaded' }, { status: 400 })
    }
    const text = await (file as File).text()
    const parsed = JSON.parse(text)
    if (!isBackupPayload(parsed)) {
      return Response.json({ error: 'Invalid backup format' }, { status: 400 })
    }
    payload = parsed
  } catch {
    return Response.json({ error: 'Could not parse backup file' }, { status: 400 })
  }

  const { data } = payload
  const counts: Record<string, number> = {}

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Restore service teams
      if (Array.isArray(data.serviceTeams) && data.serviceTeams.length > 0) {
        for (const team of data.serviceTeams as Record<string, unknown>[]) {
          await tx.serviceTeam.upsert({
            where: { id: team.id as string },
            update: {
              name: team.name as string,
              description: (team.description as string | null) ?? null,
              isActive: (team.isActive as boolean) ?? true,
            },
            create: {
              id: team.id as string,
              name: team.name as string,
              description: (team.description as string | null) ?? null,
              isActive: (team.isActive as boolean) ?? true,
            },
          })
        }
        counts.serviceTeams = data.serviceTeams.length
      }

      // 2. Restore service team members
      if (Array.isArray(data.serviceTeamMembers) && data.serviceTeamMembers.length > 0) {
        for (const m of data.serviceTeamMembers as Record<string, unknown>[]) {
          await tx.serviceTeamMember.upsert({
            where: { phone: m.phone as string },
            update: {
              fullName: m.fullName as string,
              firstName: m.firstName as string,
              lastName: m.lastName as string,
              homeLocation: (m.homeLocation as string | null) ?? null,
              email: (m.email as string | null) ?? null,
            },
            create: {
              id: m.id as string,
              fullName: m.fullName as string,
              firstName: m.firstName as string,
              lastName: m.lastName as string,
              phone: m.phone as string,
              homeLocation: (m.homeLocation as string | null) ?? null,
              email: (m.email as string | null) ?? null,
            },
          })
        }
        counts.serviceTeamMembers = data.serviceTeamMembers.length
      }

      // 3. Restore notification settings
      if (Array.isArray(data.notificationSettings) && data.notificationSettings.length > 0) {
        await tx.notificationSetting.deleteMany()
        for (const n of data.notificationSettings as Record<string, unknown>[]) {
          await tx.notificationSetting.create({
            data: {
              id: n.id as string,
              event: n.event as string,
              recipientEmail: n.recipientEmail as string,
              recipientName: (n.recipientName as string | null) ?? null,
              serviceTeamId: (n.serviceTeamId as string | null) ?? null,
              isActive: (n.isActive as boolean) ?? true,
            },
          })
        }
        counts.notificationSettings = data.notificationSettings.length
      }

      // 4. Restore report periods
      if (Array.isArray(data.reportPeriods) && data.reportPeriods.length > 0) {
        for (const p of data.reportPeriods as Record<string, unknown>[]) {
          await tx.reportPeriod.upsert({
            where: { month_year: { month: p.month as number, year: p.year as number } },
            update: {
              deadline: p.deadline ? new Date(p.deadline as string) : null,
              isLocked: (p.isLocked as boolean) ?? false,
              autoReminders: (p.autoReminders as boolean) ?? true,
            },
            create: {
              id: p.id as string,
              month: p.month as number,
              year: p.year as number,
              deadline: p.deadline ? new Date(p.deadline as string) : null,
              isLocked: (p.isLocked as boolean) ?? false,
              autoReminders: (p.autoReminders as boolean) ?? true,
            },
          })
        }
        counts.reportPeriods = data.reportPeriods.length
      }

      // 5. Restore custom form fields
      if (Array.isArray(data.customFormFields) && data.customFormFields.length > 0) {
        await tx.customFormField.deleteMany()
        for (const f of data.customFormFields as Record<string, unknown>[]) {
          await tx.customFormField.create({
            data: {
              id: f.id as string,
              formName: f.formName as string,
              fieldLabel: f.fieldLabel as string,
              fieldType: f.fieldType as string,
              fieldOptions: (f.fieldOptions as string | null) ?? null,
              isRequired: (f.isRequired as boolean) ?? false,
              visibleToRoles: (f.visibleToRoles as string) ?? '[]',
              fieldOrder: (f.fieldOrder as number) ?? 0,
              isActive: (f.isActive as boolean) ?? true,
            },
          })
        }
        counts.customFormFields = data.customFormFields.length
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'BACKUP_RESTORED',
        description: `Admin restored backup (exported ${payload.exportedAt}). Restored: ${JSON.stringify(counts)}`,
      },
    }).catch(() => null)

    return Response.json({ success: true, restored: counts })
  } catch (err) {
    console.error('[POST /api/backup/restore]', err)
    return Response.json({ error: 'Restore failed: ' + (err instanceof Error ? err.message : 'Unknown error') }, { status: 500 })
  }
}
