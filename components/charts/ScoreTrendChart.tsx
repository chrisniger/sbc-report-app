'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { TooltipContentProps, LegendPayload } from 'recharts'

export interface TrendPoint {
  label: string
  [key: string]: number | string | null | undefined
}

interface Props {
  data: TrendPoint[]
  teams: string[]
  height?: number
}

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7']

function TrendTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-zinc-800 border border-sbc-grey dark:border-white/10 rounded shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-sbc-black dark:text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} style={{ color: p.color }} className="mt-0.5">
          {p.name}:{' '}
          <span className="font-medium">
            {p.value != null ? Number(p.value).toFixed(2) : '—'}
          </span>
        </p>
      ))}
    </div>
  )
}

export default function ScoreTrendChart({ data, teams, height = 280 }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  if (!data.length || !teams.length) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        No data available
      </div>
    )
  }

  function toggleTeam(teamName: string) {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(teamName)) next.delete(teamName)
      else next.add(teamName)
      return next
    })
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<TrendTooltip />} />
        <Legend
          onClick={(e: LegendPayload) => {
            const key = e.dataKey
            if (typeof key === 'string') toggleTeam(key)
          }}
          wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
        />
        {teams.map((team, i) => (
          <Line
            key={team}
            type="monotone"
            dataKey={team}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            hide={hidden.has(team)}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
