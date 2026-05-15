interface StatCardProps {
  label: string
  value: number | string
  subtitle?: string
  color: 'red' | 'amber' | 'green' | 'blue'
  icon?: React.ReactNode
}

const borderColor = {
  red: 'border-sbc-red',
  amber: 'border-amber-400',
  green: 'border-green-500',
  blue: 'border-blue-500',
} as const

export default function StatCard({ label, value, subtitle, color, icon }: StatCardProps) {
  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg p-5 shadow-sm border-b-4 ${borderColor[color]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest font-medium">
            {label}
          </p>
          <p className="font-heading text-4xl text-sbc-black dark:text-white mt-1 leading-none">
            {value}
          </p>
          {subtitle && (
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-gray-200 dark:text-zinc-700 shrink-0 mt-1">{icon}</div>
        )}
      </div>
    </div>
  )
}
