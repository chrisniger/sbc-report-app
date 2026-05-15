'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'

export interface TeamScorePoint {
  name: string
  displayName: string
  avgScore: number
  membersGraded: number
}

interface Props {
  data: TeamScorePoint[]
  height?: number
  colorByScore?: boolean
  memberMode?: boolean
}

function scoreColor(score: number, memberMode: boolean): string {
  if (memberMode) {
    if (score >= 4) return '#22c55e'
    if (score >= 3) return '#f59e0b'
    return '#ef4444'
  }
  if (score >= 4.5) return '#22c55e'
  if (score >= 3.5) return '#ef4444'
  return '#f59e0b'
}

function ChartTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as TeamScorePoint
  return (
    <div className="bg-white dark:bg-zinc-800 border border-sbc-grey dark:border-white/10 rounded shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-sbc-black dark:text-white mb-1">{d.name}</p>
      <p className="text-gray-500">
        Avg Score:{' '}
        <span className="font-medium text-sbc-black dark:text-white">{d.avgScore.toFixed(2)}</span>
      </p>
      <p className="text-gray-500">
        Members Graded: <span className="font-medium">{d.membersGraded}</span>
      </p>
    </div>
  )
}

export default function TeamScoreBar({
  data,
  height = 280,
  colorByScore = true,
  memberMode = false,
}: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 52 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="displayName"
          tick={{ fontSize: 10 }}
          angle={-35}
          textAnchor="end"
          interval={0}
          tickLine={false}
        />
        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <ReferenceLine
          y={4.0}
          stroke="#9ca3af"
          strokeDasharray="4 4"
          label={{ value: 'Target 4.0', position: 'insideTopRight', fontSize: 9, fill: '#9ca3af' }}
        />
        <Bar dataKey="avgScore" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={colorByScore ? scoreColor(entry.avgScore, memberMode) : '#3b82f6'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
