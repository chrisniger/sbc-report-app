'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, BarChart2, FileText, Users, UserCog, Settings,
  HardDrive, ClipboardCheck, FilePlus, History, LogOut,
} from 'lucide-react'
import { NAV_CONFIG } from '@/lib/nav-config'
import type { Role } from '@/lib/roles'

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={15} />,
  BarChart2: <BarChart2 size={15} />,
  FileText: <FileText size={15} />,
  Users: <Users size={15} />,
  UserCog: <UserCog size={15} />,
  Settings: <Settings size={15} />,
  HardDrive: <HardDrive size={15} />,
  ClipboardCheck: <ClipboardCheck size={15} />,
  FilePlus: <FilePlus size={15} />,
  History: <History size={15} />,
}

interface SidebarProps {
  role: Role
  userName: string
  userInitials: string
  userRole: string
  badgeCounts?: Record<string, number>
}

export default function Sidebar({ role, userName, userInitials, userRole, badgeCounts = {} }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [logoError, setLogoError] = useState(false)

  const navItems = NAV_CONFIG[role] ?? []

  const sections = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = []
    acc[item.section].push(item)
    return acc
  }, {})

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrator',
    HEAD_OF_SUPERVISOR: 'Head of Supervisor',
    SUPERVISOR_PASTOR: 'Supervisor Pastor',
    HOD: 'Head of Department',
  }

  return (
    <div className="flex flex-col w-[220px] min-h-screen bg-sbc-black border-r border-white/10 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-[18px] border-b border-white/10">
        {!logoError ? (
          <div className="relative w-9 h-9 shrink-0">
            <Image
              src="/images/logo.png"
              alt="SBC Logo"
              fill
              className="object-contain"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          <div className="w-9 h-9 bg-sbc-red flex items-center justify-center shrink-0">
            <span className="font-heading text-white text-sm leading-none">SBC</span>
          </div>
        )}
        <div>
          <div className="font-heading text-white text-sm tracking-widest leading-tight">SUMMIT BIBLE</div>
          <div className="text-white/40 text-[10px] uppercase tracking-wider leading-tight">Report System</div>
        </div>
      </div>

      {/* User badge */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="w-9 h-9 rounded-full bg-sbc-red flex items-center justify-center shrink-0">
          <span className="font-heading text-white text-sm leading-none">{userInitials}</span>
        </div>
        <div className="min-w-0">
          <div className="text-white text-xs font-medium truncate">{userName}</div>
          <div className="text-white/40 text-[10px] truncate">{roleLabel[userRole] ?? userRole}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-4">
            <div className="px-4 py-1 text-white/30 text-[10px] uppercase tracking-widest font-medium">
              {section}
            </div>
            {items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
              const badge = item.badge ?? badgeCounts[item.href]
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 mx-2 px-3 py-2 rounded text-sm transition-colors ${
                    isActive
                      ? 'text-white bg-white/10 border-l-2 border-sbc-red pl-[10px]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="shrink-0">{ICON_MAP[item.iconName]}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge != null && badge > 0 && (
                    <span className="bg-sbc-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
