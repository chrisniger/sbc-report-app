'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}

export default function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full ${maxWidth} overflow-hidden mt-10 mb-10`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-sbc-grey dark:border-white/10">
          <h3 className="font-heading text-lg text-sbc-black dark:text-white tracking-widest">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-sbc-black dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
