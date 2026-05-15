import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import BackupClient from '@/components/admin/BackupClient'
import type { ActivityEntry } from '@/components/admin/BackupClient'

async function getData() {
  const [lastBackup, activities] = await Promise.all([
    prisma.activityLog.findFirst({
      where: { action: 'BACKUP_DOWNLOADED' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.activityLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ])

  const activityLogs: ActivityEntry[] = activities.map((a) => ({
    id: a.id,
    action: a.action,
    description: a.description,
    entityType: a.entityType,
    entityId: a.entityId,
    createdAt: a.createdAt.toISOString(),
    user: a.user,
  }))

  return {
    lastBackupAt: lastBackup?.createdAt?.toISOString() ?? null,
    activityLogs,
  }
}

export default async function AdminBackupPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) redirect('/dashboard')

  const { lastBackupAt, activityLogs } = await getData()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-sbc-black dark:text-white tracking-widest">
          BACKUP & RESTORE
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Download, export or restore system data
        </p>
      </div>

      <BackupClient lastBackupAt={lastBackupAt} activityLogs={activityLogs} />
    </div>
  )
}
