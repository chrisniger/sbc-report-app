'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportRecord {
  id: string
  reportMonth: number
  reportYear: number
  status: string
  hodName: string
  totalMembersEnrolled: number
  totalMembersPresent: number | null
  submittedAt: string | null
  serviceTeam: { id: string; name: string }
  hodProfile: { id: string; hodName: string }
  pastorReview: { id: string; submittedAt: string | null } | null
  headReview: { id: string; submittedAt: string | null } | null
  memberGrades: {
    id: string
    averageScore: number | null
    member: { id: string; fullName: string }
  }[]
}

export interface SummaryStats {
  total: number
  submitted: number
  pastorReviewed: number
  headReviewed: number
  pending: number
}

interface Props {
  initialReports: ReportRecord[]
  stats: SummaryStats
  teams: { id: string; name: string }[]
  pastors: { id: string; pastorName: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PASTOR_REVIEWED: 'Pastor Reviewed',
  HEAD_REVIEWED: 'Head Reviewed',
  COMPLETED: 'Completed',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400',
  SUBMITTED: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  PASTOR_REVIEWED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  HEAD_REVIEWED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
}

const GRADE_NUMS: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, NOT_APPLICABLE: 0,
}

// ─── Expanded Row ─────────────────────────────────────────────────────────────

function ExpandedGrades({ report }: { report: ReportRecord }) {
  if (!report.memberGrades.length) {
    return (
      <tr>
        <td colSpan={9} className="px-8 py-4 text-xs text-gray-400">
          No member grades recorded.
        </td>
      </tr>
    )
  }

  return (
    <tr className="bg-zinc-50 dark:bg-zinc-900/40">
      <td colSpan={9} className="px-8 py-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left py-1 font-medium w-48">Member</th>
              <th className="text-center py-1 font-medium">Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {report.memberGrades
              .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))
              .map((g) => (
                <tr key={g.id} className="border-t border-sbc-grey/30 dark:border-white/5">
                  <td className="py-1.5 text-sbc-black dark:text-white">{g.member.fullName}</td>
                  <td className="py-1.5 text-center text-gray-600 dark:text-gray-400">
                    {g.averageScore !== null ? g.averageScore.toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </td>
    </tr>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportsAdminClient({ initialReports, stats, teams, pastors }: Props) {
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = initialReports
    if (monthFilter) list = list.filter((r) => r.reportMonth === parseInt(monthFilter))
    if (yearFilter) list = list.filter((r) => r.reportYear === parseInt(yearFilter))
    if (teamFilter) list = list.filter((r) => r.serviceTeam.id === teamFilter)
    if (statusFilter) list = list.filter((r) => r.status === statusFilter)
    return list
  }, [initialReports, monthFilter, yearFilter, teamFilter, statusFilter])

  function avgScore(report: ReportRecord): string {
    const scores = report.memberGrades
      .map((g) => g.averageScore)
      .filter((s): s is number => s !== null)
    if (!scores.length) return '—'
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  }

  const selectCls =
    'text-xs bg-white dark:bg-zinc-800 border border-sbc-grey dark:border-white/10 rounded px-2 py-1.5 text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red'

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-sbc-black dark:text-white' },
          { label: 'Submitted', value: stats.submitted, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Pastor Reviewed', value: stats.pastorReviewed, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Head Reviewed', value: stats.headReviewed, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Pending Review', value: stats.pending, color: 'text-sbc-red' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm text-center">
            <p className={`font-heading text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-sbc-grey dark:border-white/10">
          <h2 className="font-heading text-xl text-sbc-black dark:text-white tracking-widest mr-2">
            ALL REPORTS
          </h2>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All Months</option>
            {MONTHS_FULL.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All Years</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} reports</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                <th className="w-8" />
                {['Team', 'HOD', 'Period', 'Avg Score', 'Status', 'Submitted', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm">
                    No reports found.
                  </td>
                </tr>
              ) : (
                filtered.map((report) => (
                  <>
                    <tr
                      key={report.id}
                      className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                    >
                      <td className="pl-4 py-3 text-gray-400">
                        {expandedId === report.id
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />}
                      </td>
                      <td className="px-5 py-3 font-medium text-sbc-black dark:text-white whitespace-nowrap">
                        {report.serviceTeam.name}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {report.hodName}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                        {MONTHS[report.reportMonth - 1]} {report.reportYear}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm font-medium text-sbc-black dark:text-white">
                          {avgScore(report)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_COLORS[report.status] ?? ''}`}>
                          {STATUS_LABELS[report.status] ?? report.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-500 text-xs whitespace-nowrap">
                        {report.submittedAt
                          ? new Date(report.submittedAt).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedId(expandedId === report.id ? null : report.id)
                            }}
                            className="text-xs text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors"
                          >
                            Grades
                          </button>
                          <Link
                            href={`/admin/reports/${report.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-sbc-red hover:underline font-medium"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {expandedId === report.id && (
                      <ExpandedGrades key={`${report.id}-expanded`} report={report} />
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
