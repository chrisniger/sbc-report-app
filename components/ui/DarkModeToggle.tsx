'use client'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="w-16 h-6" />

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle dark mode"
      className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-sbc-black dark:hover:text-white transition-colors"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
      <div className="relative w-9 h-5 rounded-full bg-sbc-grey dark:bg-zinc-600 transition-colors">
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-sbc-black dark:bg-white shadow transition-all duration-200 ${
            isDark ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </div>
    </button>
  )
}
