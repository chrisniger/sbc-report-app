import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { primaryRole } from '@/lib/roles'

export default async function DashboardPage() {
  let session = null
  try {
    session = await auth()
  } catch {
    redirect('/login')
  }

  if (!session?.user) redirect('/login')

  const role = primaryRole(session.user.roles)
  switch (role) {
    case 'ADMIN':
      redirect('/admin')
    case 'PASTOR':
      redirect('/head')
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
