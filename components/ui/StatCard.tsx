import Link from 'next/link'

interface StatCardProps {
  label: string
  value: number | string
  subtitle?: string
  color: 'red' | 'amber' | 'green' | 'blue'
  icon?: React.ReactNode
  href?: string
}

const borderColor = {
  red: 'border-sbc-red',
  amber: 'border-amber-400',
  green: 'border-green-500',
  blue: 'border-blue-500',
} as const

const tone = {
  red: {
    label: 'text-[#c8102e] dark:text-sbc-red',
    value: 'text-sbc-red dark:text-white',
    icon: 'text-[#c8102e] bg-[#ffe4e6] dark:text-sbc-red dark:bg-sbc-red/15',
    action: 'bg-sbc-red text-white group-hover:bg-red-700',
    glow: 'dark:shadow-[0_22px_60px_rgba(200,16,46,0.16)]',
  },
  amber: {
    label: 'text-[#d97706] dark:text-amber-400',
    value: 'text-sbc-red dark:text-white',
    icon: 'text-[#d97706] bg-[#fef3c7] dark:text-amber-400 dark:bg-amber-400/15',
    action: 'bg-[#f59e0b] text-white group-hover:bg-[#d97706]',
    glow: 'dark:shadow-[0_22px_60px_rgba(251,191,36,0.12)]',
  },
  green: {
    label: 'text-[#047857] dark:text-cyan-300',
    value: 'text-sbc-red dark:text-white',
    icon: 'text-[#059669] bg-[#d1fae5] dark:text-cyan-300 dark:bg-cyan-300/15',
    action: 'bg-[#d1fae5] text-[#047857] group-hover:bg-[#a7f3d0]',
    glow: 'dark:shadow-[0_22px_60px_rgba(103,232,249,0.12)]',
  },
  blue: {
    label: 'text-[#1d4ed8] dark:text-blue-200',
    value: 'text-sbc-red dark:text-white',
    icon: 'text-[#2563eb] bg-[#dbeafe] dark:text-blue-200 dark:bg-blue-300/15',
    action: 'bg-[#dbeafe] text-[#1d4ed8] group-hover:bg-[#bfdbfe]',
    glow: 'dark:shadow-[0_22px_60px_rgba(147,197,253,0.12)]',
  },
} as const

export default function StatCard({ label, value, subtitle, color, icon, href }: StatCardProps) {
  const className = `block bg-white rounded-[20px] p-7 shadow-[0_18px_45px_rgba(15,23,42,0.08)] border border-[#edf0f5] border-b-4 ${borderColor[color]} dark:rounded-lg dark:bg-white/[0.055] dark:border-white/10 dark:border-b dark:backdrop-blur-xl ${tone[color].glow}`
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm uppercase tracking-wide font-bold ${tone[color].label}`}>
            {label}
          </p>
          <p className={`font-heading text-5xl mt-3 leading-none ${tone[color].value}`}>
            {value}
          </p>
          {subtitle && (
            <p className={href ? `mt-4 inline-flex rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${tone[color].action}` : 'text-[#475569] dark:text-white/55 text-sm mt-3'}>
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className={`h-16 w-16 rounded-full flex items-center justify-center shrink-0 ${tone[color].icon}`}>{icon}</div>
        )}
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`${className} group transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sbc-red focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900`}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}
