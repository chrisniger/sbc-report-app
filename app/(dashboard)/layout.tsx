import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { primaryRole } from '@/lib/roles'
import type { Role } from '@/lib/roles'
import Sidebar from '@/components/ui/Sidebar'
import Topbar from '@/components/ui/Topbar'

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={role}
        userName={fullName}
        userInitials={initials}
        userRole={role}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
