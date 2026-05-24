'use client'
import { Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  if (!mounted) return <div className="w-20 h-9" />

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle dark mode"
      className="flex items-center gap-3 text-[#d97706] dark:text-white/60 hover:text-[#b45309] dark:hover:text-white transition-colors"
    >
      <span className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-[#fed7aa] bg-[#fff7ed] text-[#d97706] shadow-sm dark:border-transparent dark:bg-white/[0.06] dark:text-white/60 dark:shadow-none">
        <Sun size={20} />
      </span>
      <div className="relative w-14 h-7 rounded-full bg-sbc-red shadow-inner shadow-sbc-red/20 transition-colors dark:bg-white/10">
        <div
          className="absolute top-1 left-8 w-5 h-5 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.25)] transition-all duration-200"
        />
      </div>
    </button>
  )
}
