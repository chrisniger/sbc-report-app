'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search, Menu, CheckCheck } from 'lucide-react'
import DarkModeToggle from './DarkModeToggle'
import WhatsappContactButton from './WhatsappContactButton'

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

type NotificationItem = {
  id: string
  title: string
  body: string
  href: string
  createdAt: string
  kind: 'report' | 'review' | 'system'
}

type SearchResult = {
  id: string
  type: 'Report' | 'Team' | 'Member' | 'User'
  title: string
  subtitle: string
  href: string
}

const NOTIFICATION_SEEN_KEY = 'sbc-notifications-seen-at'
const NOTIFICATION_DISMISSED_KEY = 'sbc-notifications-dismissed-ids'

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function getDismissedIds() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(NOTIFICATION_DISMISSED_KEY) ?? '[]') as string[])
  } catch {
    return new Set<string>()
  }
}

function saveDismissedIds(ids: Set<string>) {
  window.localStorage.setItem(NOTIFICATION_DISMISSED_KEY, JSON.stringify([...ids]))
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname()
  const title = PATH_TITLES[pathname] ?? 'Dashboard'
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  async function loadNotifications() {
    const since = typeof window !== 'undefined'
      ? window.localStorage.getItem(NOTIFICATION_SEEN_KEY)
      : null
    const params = since ? `?since=${encodeURIComponent(since)}` : ''
    const res = await fetch(`/api/notifications${params}`, { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json() as { unreadCount: number; items: NotificationItem[] }
    const dismissedIds = getDismissedIds()
    const visibleItems = data.items.filter((item) => !dismissedIds.has(item.id))
    const sinceDate = since ? new Date(since) : null
    setItems(visibleItems)
    setUnreadCount(
      sinceDate
        ? visibleItems.filter((item) => new Date(item.createdAt) > sinceDate).length
        : visibleItems.length
    )
  }

  function markRead() {
    const now = new Date().toISOString()
    window.localStorage.setItem(NOTIFICATION_SEEN_KEY, now)
    setUnreadCount(0)
  }

  function dismissNotification(id: string) {
    const dismissedIds = getDismissedIds()
    dismissedIds.add(id)
    saveDismissedIds(dismissedIds)
    setItems((current) => current.filter((item) => item.id !== id))
    setUnreadCount((count) => Math.max(0, count - 1))
    setOpen(false)
  }

  function closeSearch() {
    setSearchOpen(false)
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadNotifications().catch(() => null)
    }, 0)
    const interval = window.setInterval(() => {
      loadNotifications().catch(() => null)
    }, 60000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2) {
      const reset = window.setTimeout(() => {
        setSearchResults([])
        setSearchLoading(false)
      }, 0)
      return () => window.clearTimeout(reset)
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearchLoading(true)
      fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
        .then((response) => response.ok ? response.json() : { results: [] })
        .then((data: { results?: SearchResult[] }) => {
          setSearchResults(data.results ?? [])
          setSearchOpen(true)
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearchResults([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false)
        })
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [searchQuery])

  return (
    <header className="relative z-[100] h-20 flex items-center gap-4 px-4 md:px-8 bg-white/85 backdrop-blur-xl border-b border-[#e5e7eb] shadow-[0_8px_28px_rgba(15,23,42,0.04)] shrink-0 dark:bg-[#080912]/88 dark:border-sbc-red/20 dark:shadow-none">
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
      <div ref={searchRef} className="hidden sm:block flex-1 max-w-md ml-5 relative">
        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94a3b8] dark:text-white/55 pointer-events-none" />
        <input
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value)
            setSearchOpen(event.target.value.trim().length >= 2)
          }}
          onFocus={() => setSearchOpen(searchQuery.trim().length >= 2)}
          className="w-full pl-12 pr-5 py-3 text-base bg-white border border-[#dfe4ec] rounded-xl shadow-[0_8px_22px_rgba(15,23,42,0.06)] outline-none text-[#111827] placeholder:text-[#94a3b8] transition-colors focus:border-sbc-red/40 focus:ring-4 focus:ring-sbc-red/10 dark:rounded-lg dark:bg-white/[0.055] dark:border-white/10 dark:text-white dark:placeholder:text-white/45 dark:shadow-none dark:focus:border-white/20 dark:focus:ring-white/5"
        />

        {searchOpen && (
          <div className="absolute left-0 right-0 top-full z-[120] mt-3 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-zinc-900">
            <div className="border-b border-[#eef2f7] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#64748b] dark:border-white/10 dark:text-white/45">
              Global Search
            </div>
            <div className="max-h-96 overflow-y-auto py-1">
              {searchLoading ? (
                <div className="px-4 py-5 text-sm text-[#64748b] dark:text-white/45">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-5 text-sm text-[#64748b] dark:text-white/45">No matching results.</div>
              ) : (
                searchResults.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    onClick={closeSearch}
                    className="block border-b border-[#eef2f7] px-4 py-3 transition-colors last:border-b-0 hover:bg-[#fff7f8] dark:border-white/5 dark:hover:bg-white/5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 rounded-md bg-sbc-red/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sbc-red dark:bg-sbc-red/15">
                        {result.type}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111827] dark:text-white">{result.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#475569] dark:text-white/55">{result.subtitle}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <WhatsappContactButton />
        <div ref={dropdownRef} className="relative">
          <button
            aria-label="Notifications"
            onClick={() => {
              setOpen((value) => !value)
              if (!open) markRead()
            }}
            className="relative p-2 text-[#475569] hover:text-sbc-red dark:text-white/70 dark:hover:text-white transition-colors"
          >
            <Bell size={21} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sbc-red px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full z-[110] mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3 dark:border-white/10">
                <div>
                  <p className="text-sm font-semibold text-[#111827] dark:text-white">Notifications</p>
                  <p className="text-xs text-[#64748b] dark:text-white/45">Latest report activity</p>
                </div>
                <button
                  type="button"
                  onClick={markRead}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sbc-red hover:bg-sbc-red/10"
                >
                  <CheckCheck size={13} />
                  Read
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto py-1">
                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[#64748b] dark:text-white/45">
                    No notifications yet.
                  </div>
                ) : (
                  items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => dismissNotification(item.id)}
                      className="block border-b border-[#eef2f7] px-4 py-3 transition-colors last:border-b-0 hover:bg-[#fff7f8] dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#111827] dark:text-white">{item.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#475569] dark:text-white/55">{item.body}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-[#94a3b8] dark:text-white/35">{relativeTime(item.createdAt)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <DarkModeToggle />
      </div>
    </header>
  )
}
