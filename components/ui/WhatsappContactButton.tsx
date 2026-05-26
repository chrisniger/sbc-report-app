'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'

type WhatsappContact = {
  phone: string | null
  href: string | null
}

type Props = {
  variant?: 'login' | 'topbar'
}

export default function WhatsappContactButton({ variant = 'topbar' }: Props) {
  const [contact, setContact] = useState<WhatsappContact | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      fetch('/api/settings/whatsapp', { cache: 'no-store', signal: controller.signal })
        .then((response) => response.ok ? response.json() : { phone: null, href: null })
        .then((data: WhatsappContact) => setContact(data))
        .catch(() => {
          if (!controller.signal.aborted) setContact({ phone: null, href: null })
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoaded(true)
        })
    }, 0)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [])

  if (!loaded) {
    return variant === 'login' ? (
      <p className="mt-7 text-white/25 text-xs text-center">
        Forgot your password? Contact your system administrator.
      </p>
    ) : null
  }

  if (!contact?.href) {
    return variant === 'login' ? (
      <p className="mt-7 text-white/25 text-xs text-center">
        Forgot your password? Contact your system administrator.
      </p>
    ) : null
  }

  if (variant === 'login') {
    return (
      <div className="mt-7 flex justify-center">
        <a
          href={contact.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 hover:text-emerald-200"
        >
          <MessageCircle size={15} />
          Contact Admin on WhatsApp
        </a>
      </div>
    )
  }

  return (
    <a
      href={contact.href}
      target="_blank"
      rel="noreferrer"
      aria-label="Contact admin on WhatsApp"
      title="Contact admin on WhatsApp"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_8px_18px_rgba(16,185,129,0.12)] transition-colors hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:shadow-none dark:hover:bg-emerald-500/15"
    >
      <MessageCircle size={19} />
    </a>
  )
}
