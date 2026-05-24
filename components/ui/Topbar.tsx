'use client'
import { usePathname } from 'next/navigation'
import { Bell, Search, Menu } from 'lucide-react'
import DarkModeToggle from './DarkModeToggle'

const PATH_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/analytics': 'Analytics & Reports',
  '/admin/reports': 'All Reports',
  '/admin/members': 'Team Members',
  '/admin/users': 'User Management',
  '/admin/settings': 'Settings & SMTP',
  '/admin/backup': 'Backup & Restore',
  '/head': 'Dashboard',
  '/head/analytics': 'Reports & Analytics',
  '/head/reports': 'All Reports',
  '/head/teams': 'Service Teams',
  '/pastor': 'Dashboard',
  '/pastor/reports': 'Team Reports',
  '/pastor/teams': 'My Service Teams',
  '/pastor/analytics': 'Team Analytics',
  '/hod': 'Dashboard',
  '/hod/report': 'Submit Report',
  '/hod/members': 'My Team Members',
  '/hod/reports': 'My Reports History',
}

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname()
  const title = PATH_TITLES[pathname] ?? 'Dashboard'

  return (
    <header className="h-20 flex items-center gap-4 px-4 md:px-8 bg-white/85 backdrop-blur-xl border-b border-[#e5e7eb] shadow-[0_8px_28px_rgba(15,23,42,0.04)] shrink-0 dark:bg-[#080912]/88 dark:border-sbc-red/20 dark:shadow-none">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-1 text-slate-500 dark:text-white/65 hover:text-sbc-red dark:hover:text-white transition-colors"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <h1 className="font-heading text-[#0f172a] dark:text-white text-3xl tracking-widest shrink-0 truncate">
        {title}
      </h1>

      {/* Search — hidden on small screens */}
      <div className="hidden sm:block flex-1 max-w-md ml-5 relative">
        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94a3b8] dark:text-white/55 pointer-events-none" />
        <input
          type="search"
          placeholder="Search..."
          className="w-full pl-12 pr-5 py-3 text-base bg-white border border-[#dfe4ec] rounded-xl shadow-[0_8px_22px_rgba(15,23,42,0.06)] outline-none text-[#111827] placeholder:text-[#94a3b8] transition-colors focus:border-sbc-red/40 focus:ring-4 focus:ring-sbc-red/10 dark:rounded-lg dark:bg-white/[0.055] dark:border-white/10 dark:text-white dark:placeholder:text-white/45 dark:shadow-none dark:focus:border-white/20 dark:focus:ring-white/5"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="relative p-2 text-[#475569] hover:text-sbc-red dark:text-white/70 dark:hover:text-white transition-colors"
        >
          <Bell size={21} />
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sbc-red px-1 text-[10px] font-bold leading-none text-white">3</span>
        </button>
        <DarkModeToggle />
      </div>
    </header>
  )
}
