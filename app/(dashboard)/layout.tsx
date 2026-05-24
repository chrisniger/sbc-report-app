import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { primaryRole } from '@/lib/roles'
import type { Role } from '@/lib/roles'
import DashboardShell from '@/components/ui/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user
  const role = (primaryRole(user.roles) ?? 'HOD') as Role
  const first = user.firstName ?? ''
  const last = user.lastName ?? ''
  const initials = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || 'U'
  const fullName = `${first} ${last}`.trim()

  return (
    <DashboardShell
      role={role}
      userName={fullName}
      userInitials={initials}
      userRole={role}
    >
      {children}
    </DashboardShell>
  )
}
