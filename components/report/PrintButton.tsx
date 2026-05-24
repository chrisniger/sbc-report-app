'use client'
import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 px-3 py-1.5 border border-sbc-grey dark:border-white/10 text-xs text-gray-600 dark:text-gray-400 rounded hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors print:hidden"
    >
      <Printer size={13} />
      Print / Save PDF
    </button>
  )
}
