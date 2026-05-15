'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

let _id = 0
const _listeners: ((t: ToastItem) => void)[] = []

export function toast(type: ToastType, message: string) {
  const item: ToastItem = { id: ++_id, type, message }
  _listeners.forEach((fn) => fn(item))
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const handler = (t: ToastItem) => {
      setItems((prev) => [...prev, t])
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id))
      }, 4500)
    }
    _listeners.push(handler)
    return () => {
      const i = _listeners.indexOf(handler)
      if (i >= 0) _listeners.splice(i, 1)
    }
  }, [])

  if (!items.length) return null

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl text-sm font-medium text-white animate-in slide-in-from-right-4 ${
            t.type === 'success'
              ? 'bg-green-600'
              : t.type === 'error'
              ? 'bg-sbc-red'
              : 'bg-zinc-700'
          }`}
        >
          {t.type === 'success' && <CheckCircle size={15} className="shrink-0" />}
          {t.type === 'error' && <AlertCircle size={15} className="shrink-0" />}
          <span>{t.message}</span>
          <button
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
