'use client'

export interface TabDef {
  id: string
  label: string
}

interface TabsProps {
  tabs: TabDef[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export default function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex border-b border-sbc-grey dark:border-white/10 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            active === tab.id
              ? 'border-sbc-red text-sbc-red'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-sbc-black dark:hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
