'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, BarChart2, FileText, Users, UserCog, Settings,
  HardDrive, ClipboardCheck, FilePlus, History, LogOut, ChevronDown,
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
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({
  role,
  userName,
  userInitials,
  userRole,
  badgeCounts = {},
  isOpen = false,
  onClose,
}: SidebarProps) {
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
    PASTOR: 'Pastor',
    HEAD_OF_SUPERVISOR: 'Committee',
    SUPERVISOR_PASTOR: 'Supervising Pastor',
    HOD: 'HOSTs',
  }

  const handleNavClick = () => {
    onClose?.()
  }

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-[270px] bg-white border-r border-[#e5e7eb]
        shadow-[18px_0_50px_rgba(15,23,42,0.05)] backdrop-blur-xl
        dark:bg-[#0b0d15]/95 dark:border-sbc-red/20 dark:shadow-[18px_0_70px_rgba(200,16,46,0.1)]
        transition-transform duration-300 ease-in-out
        md:static md:translate-x-0 md:z-auto md:shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-4 px-7 py-7 border-b border-[#edf0f5] dark:border-sbc-red/20">
        {!logoError ? (
          <div className="relative w-12 h-12 shrink-0 rounded-xl shadow-[0_12px_24px_rgba(200,16,46,0.16)] dark:shadow-[0_14px_30px_rgba(255,255,255,0.16)]">
            <Image
              src="/images/logo.png"
              alt="SBC Logo"
              fill
              sizes="48px"
              className="object-contain drop-shadow-[0_7px_10px_rgba(200,16,46,0.12)] dark:drop-shadow-[0_8px_12px_rgba(255,255,255,0.18)]"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-sbc-red flex items-center justify-center shrink-0 shadow-lg shadow-sbc-red/25">
            <span className="font-heading text-white text-2xl leading-none">SBC</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-heading text-slate-900 dark:text-white text-[clamp(0.82rem,0.9vw,1rem)] tracking-wider leading-tight whitespace-nowrap">
            SUMMIT BIBLE CHURCH
          </div>
          <div className="text-sbc-red text-xs uppercase tracking-wider leading-tight font-semibold">Report System</div>
        </div>
      </div>

      {/* User badge */}
      <div className="px-4 py-6">
        <div className="flex items-center gap-3 rounded-2xl border border-[#edf0f5] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:rounded-lg dark:border-white/10 dark:bg-white/[0.03]">
        <div className="w-11 h-11 rounded-full bg-sbc-red flex items-center justify-center shrink-0 shadow-md shadow-sbc-red/20">
          <span className="font-heading text-white text-xl leading-none">{userInitials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[#111827] dark:text-white text-sm font-semibold truncate">{userName}</div>
          <div className="text-[#475569] dark:text-white/45 text-xs truncate">{roleLabel[userRole] ?? userRole}</div>
        </div>
        <ChevronDown size={16} className="text-slate-500 dark:text-white/55" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-6">
            <div className="px-3 py-2 text-sbc-red dark:text-sbc-red/80 text-xs uppercase tracking-widest font-bold">
              {section}
            </div>
            {items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
              const badge = item.badge ?? badgeCounts[item.href]
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? 'text-sbc-red bg-[#fff1f2] border-l-2 border-sbc-red pl-[14px] dark:text-white dark:bg-sbc-red/15'
                      : 'text-[#475569] hover:text-sbc-red hover:bg-[#fff7f8] dark:text-white/65 dark:hover:text-white dark:hover:bg-white/5'
                  }`}
                >
                  <span className="shrink-0 text-current">{ICON_MAP[item.iconName]}</span>
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
      <div className="border-t border-[#edf0f5] dark:border-white/10 p-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-4 w-full px-4 py-3 rounded-xl border border-[#e5e7eb] bg-white text-[#111827] shadow-sm hover:text-sbc-red hover:border-sbc-red/30 hover:bg-[#fff7f8] transition-colors text-sm font-semibold dark:rounded-lg dark:border-white/10 dark:bg-transparent dark:text-white/70 dark:hover:text-white dark:hover:bg-white/5"
        >
          <LogOut size={18} className="text-sbc-red" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
