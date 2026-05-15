import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { primaryRole } from '@/lib/roles'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = primaryRole(session.user.roles)
  switch (role) {
    case 'ADMIN':
      redirect('/admin')
    case 'HEAD_OF_SUPERVISOR':
      redirect('/head')
    case 'SUPERVISOR_PASTOR':
      redirect('/pastor')
    case 'HOD':
      redirect('/hod')
    default:
      redirect('/login')
  }
}
