'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'

export interface PastorBarEntry {
  pastorName: string
  displayName: string
  [teamName: string]: number | string | null | undefined
}

interface Props {
  data: PastorBarEntry[]
  teams: string[]
  height?: number
}

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16']

function GroupTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-zinc-800 border border-sbc-grey dark:border-white/10 rounded shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-sbc-black dark:text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="mt-0.5">
          {p.name}:{' '}
          <span className="font-medium">
            {p.value != null ? Number(p.value).toFixed(2) : '—'}
          </span>
        </p>
      ))}
    </div>
  )
}

export default function PastorGroupedBar({ data, teams, height = 300 }: Props) {
  if (!data.length || !teams.length) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 24 }} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="displayName" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<GroupTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {teams.map((team, i) => (
          <Bar
            key={team}
            dataKey={team}
            fill={COLORS[i % COLORS.length]}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
