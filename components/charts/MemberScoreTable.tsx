'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Download, Loader2 } from 'lucide-react'

export interface MemberRow {
  rank: number
  name: string
  team: string
  avgScore: number
  reportsCount: number
}

interface Props {
  initialData: MemberRow[]
  showFilter?: boolean
  teamId?: string
}

const MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const CURRENT_YEAR = new Date().getFullYear()

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min((score / 5) * 100, 100)
  const cls = score >= 4.5 ? 'bg-green-500' : score >= 3.5 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-1.5 min-w-[72px]">
      <div className="flex-1 bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
        <div className={`${cls} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium w-7 text-right tabular-nums">{score.toFixed(2)}</span>
    </div>
  )
}

type SortKey = 'rank' | 'name' | 'team' | 'avgScore' | 'reportsCount'

const COLS: [SortKey, string][] = [
  ['rank', '#'],
  ['name', 'Name'],
  ['team', 'Team'],
  ['avgScore', 'Avg Score'],
  ['reportsCount', 'Reports'],
]

export default function MemberScoreTable({ initialData, showFilter = false, teamId }: Props) {
  const [rows, setRows] = useState<MemberRow[]>(initialData)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [loading, setLoading] = useState(false)

  const displayed = rows
    .filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.team.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'name' || sortKey === 'team') {
        return mul * a[sortKey].localeCompare(b[sortKey])
      }
      return mul * ((a[sortKey] as number) - (b[sortKey] as number))
    })

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  async function applyFilter() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '10' })
      if (filterMonth) params.set('month', filterMonth)
      if (filterYear) params.set('year', filterYear)
      if (teamId) params.set('teamId', teamId)
      const res = await fetch(`/api/analytics/members?${params}`)
      if (res.ok) {
        const json = (await res.json()) as MemberRow[]
        setRows(json)
      }
    } catch { /* noop */ }
    setLoading(false)
  }

  function exportCSV() {
    const csvRows = [
      ['Rank', 'Name', 'Team', 'Avg Score', 'Reports'],
      ...displayed.map(r => [r.rank, `"${r.name}"`, `"${r.team}"`, r.avgScore.toFixed(2), r.reportsCount]),
    ]
    const csv = csvRows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `top-members-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const thCls =
    'text-left px-3 py-2.5 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-medium cursor-pointer hover:text-sbc-black dark:hover:text-white select-none whitespace-nowrap'

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search by name or team…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-36 text-xs px-2.5 py-1.5 bg-sbc-grey dark:bg-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-sbc-red"
        />
        {showFilter && (
          <>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="text-xs px-2 py-1.5 bg-sbc-grey dark:bg-zinc-700 rounded focus:outline-none"
            >
              <option value="">All Months</option>
              {MONTHS_FULL.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="text-xs px-2 py-1.5 bg-sbc-grey dark:bg-zinc-700 rounded focus:outline-none"
            >
              <option value="">All Years</option>
              {Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={applyFilter}
              disabled={loading}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-sbc-red text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loading && <Loader2 size={10} className="animate-spin" />}
              Apply
            </button>
          </>
        )}
        <button
          onClick={exportCSV}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-sbc-grey dark:border-white/10 rounded hover:bg-sbc-grey dark:hover:bg-zinc-700 text-gray-500"
        >
          <Download size={11} /> CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border border-sbc-grey dark:border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-sbc-grey dark:border-white/10">
              {COLS.map(([key, label]) => (
                <th key={key} className={thCls} onClick={() => handleSort(key)}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {sortKey === key
                      ? (sortDir === 'asc'
                          ? <ChevronUp size={11} />
                          : <ChevronDown size={11} />)
                      : <ChevronUp size={11} className="opacity-20" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                  No members found
                </td>
              </tr>
            ) : (
              displayed.map(row => (
                <tr
                  key={`${row.name}-${row.team}`}
                  className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5"
                >
                  <td className="px-3 py-2 text-gray-400 font-mono">#{row.rank}</td>
                  <td className="px-3 py-2 font-medium text-sbc-black dark:text-white whitespace-nowrap">
                    {row.name}
                  </td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {row.team}
                  </td>
                  <td className="px-3 py-2">
                    <ScoreBar score={row.avgScore} />
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-center">{row.reportsCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
