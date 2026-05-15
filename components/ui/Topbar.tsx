'use client'
import { usePathname } from 'next/navigation'
import { Bell, Search } from 'lucide-react'
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
  '/head/review/submit': 'Submit Review',
  '/head/reports': 'All Submitted Reports',
  '/head/teams': 'Service Teams',
  '/pastor': 'Dashboard',
  '/pastor/reports': 'Team Reports',
  '/pastor/review': 'Submit Review',
  '/pastor/teams': 'My Service Teams',
  '/pastor/analytics': 'Team Analytics',
  '/head/review': 'Submit Review',
  '/hod': 'Dashboard',
  '/hod/report': 'Submit Report',
  '/hod/members': 'My Team Members',
  '/hod/reports': 'My Reports History',
}

export default function Topbar() {
  const pathname = usePathname()
  const title = PATH_TITLES[pathname] ?? 'Dashboard'

  return (
    <header className="h-14 flex items-center gap-4 px-6 bg-white dark:bg-zinc-900 border-b border-sbc-grey dark:border-white/10 shrink-0">
      <h1 className="font-heading text-sbc-black dark:text-white text-2xl tracking-widest shrink-0">
        {title}
      </h1>

      <div className="flex-1 max-w-xs ml-4 relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search..."
          className="w-full pl-8 pr-4 py-1.5 text-sm bg-sbc-grey dark:bg-white/5 border border-transparent focus:border-sbc-grey dark:focus:border-white/20 rounded outline-none text-sbc-black dark:text-white placeholder:text-gray-400 transition-colors"
        />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <button
          aria-label="Notifications"
          className="relative p-1.5 text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors"
        >
          <Bell size={17} />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-sbc-red rounded-full" />
        </button>
        <DarkModeToggle />
      </div>
    </header>
  )
}
