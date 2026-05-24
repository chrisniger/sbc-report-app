'use client'
import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import type { Role } from '@/lib/roles'

interface Props {
  role: Role
  userName: string
  userInitials: string
  userRole: string
  children: React.ReactNode
}

export default function DashboardShell({ role, userName, userInitials, userRole, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f5f3] text-[#111827] dark:bg-[#080912] dark:text-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        role={role}
        userName={userName}
        userInitials={userInitials}
        userRole={userRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[#f8f5f3] p-4 md:p-8 dark:bg-[radial-gradient(circle_at_12%_12%,rgba(200,16,46,0.16),transparent_28%),radial-gradient(circle_at_85%_8%,rgba(200,16,46,0.1),transparent_24%),linear-gradient(135deg,#080912_0%,#11131d_55%,#160b12_100%)]">
          {children}
        </main>
      </div>
    </div>
  )
}
