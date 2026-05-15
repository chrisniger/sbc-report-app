'use client'

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'

export interface StatusSlice {
  status: string
  count: number
}

interface Props {
  data: StatusSlice[]
  height?: number
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#22c55e',
  PASTOR_REVIEWED: '#3b82f6',
  HEAD_REVIEWED: '#a855f7',
  COMPLETED: '#7c3aed',
  DRAFT: '#f59e0b',
  OVERDUE: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  PASTOR_REVIEWED: 'Pastor Reviewed',
  HEAD_REVIEWED: 'Head Reviewed',
  COMPLETED: 'Completed',
  DRAFT: 'Pending',
  OVERDUE: 'Overdue',
}

interface SliceEntry {
  status: string
  count: number
  name: string
  color: string
}

function PieTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as SliceEntry
  return (
    <div className="bg-white dark:bg-zinc-800 border border-sbc-grey dark:border-white/10 rounded shadow-lg px-3 py-2 text-xs">
      <p className="font-medium mb-0.5" style={{ color: d.color }}>{d.name}</p>
      <p className="text-gray-500">{d.count} report{d.count !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function SubmissionPie({ data, height = 280 }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0)

  if (!total) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        No data available
      </div>
    )
  }

  const formatted: SliceEntry[] = data
    .filter(d => d.count > 0)
    .map(d => ({
      ...d,
      name: STATUS_LABELS[d.status] ?? d.status,
      color: STATUS_COLORS[d.status] ?? '#9ca3af',
    }))

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formatted}
            cx="50%"
            cy="42%"
            innerRadius="35%"
            outerRadius="58%"
            dataKey="count"
            paddingAngle={2}
            isAnimationActive
          >
            {formatted.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div className="text-2xl font-heading font-bold text-sbc-black dark:text-white leading-none">
          {total}
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">Total</div>
      </div>
    </div>
  )
}
