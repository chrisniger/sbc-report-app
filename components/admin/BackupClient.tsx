'use client'

import { useState, useRef } from 'react'
import {
  Download, FileUp, RotateCcw, History, Loader2, AlertTriangle, CheckCircle, FileJson,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string
  action: string
  description: string
  entityType: string | null
  entityId: string | null
  createdAt: string
  user: { firstName: string; lastName: string | null } | null
}

interface Props {
  lastBackupAt: string | null
  activityLogs: ActivityEntry[]
}

const MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const CURRENT_YEAR = new Date().getFullYear()

// ─── Full Backup Card ─────────────────────────────────────────────────────────

function FullBackupCard({ lastBackupAt }: { lastBackupAt: string | null }) {
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try {
      const res = await fetch('/api/backup/download')
      if (!res.ok) { toast('error', 'Download failed'); setLoading(false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sbc-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('success', 'Backup downloaded')
    } catch {
      toast('error', 'Download failed — network error')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-3">
        <FileJson size={28} className="text-sbc-red shrink-0 mt-0.5" />
        <div>
          <h3 className="font-heading text-xl text-sbc-black dark:text-white tracking-widest">FULL BACKUP</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Downloads all reports, members, settings, form structures and user data as a JSON file.
            Passwords are excluded for security.
          </p>
        </div>
      </div>

      {lastBackupAt && (
        <p className="text-xs text-gray-400">
          Last backup: {new Date(lastBackupAt).toLocaleString('en-GB')}
        </p>
      )}

      <button
        onClick={download}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        Download Full Backup
      </button>
    </div>
  )
}

// ─── Reports Export Card ──────────────────────────────────────────────────────

function ReportsExportCard() {
  const [month, setMonth] = useState('')
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [loading, setLoading] = useState(false)

  async function exportReports() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (year) params.set('year', year)
      const res = await fetch(`/api/backup/reports?${params}`)
      if (!res.ok) { toast('error', 'Export failed'); setLoading(false); return }
      const blob = await res.blob()
      const monthLabel = month ? MONTHS_FULL[parseInt(month) - 1] : 'All'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sbc-reports-${monthLabel}-${year || 'All'}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast('success', 'Reports exported')
    } catch {
      toast('error', 'Export failed — network error')
    }
    setLoading(false)
  }

  const selectCls =
    'text-sm bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded px-2 py-1.5 text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red'

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Download size={28} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-heading text-xl text-sbc-black dark:text-white tracking-widest">REPORTS EXPORT</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Export submitted HOD reports and pastor reviews as an Excel workbook with multiple sheets.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls}>
          <option value="">All Months</option>
          {MONTHS_FULL.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
          <option value="">All Years</option>
          {Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <button
        onClick={exportReports}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
        Export as Excel
      </button>
    </div>
  )
}

// ─── Restore Card ─────────────────────────────────────────────────────────────

function RestoreCard() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; restored?: Record<string, number>; error?: string } | null>(null)

  async function handleRestore() {
    if (!file || !confirmed) return
    setLoading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/backup/restore', { method: 'POST', body: fd })
      const json = await res.json()
      setResult(json)
      if (json.success) toast('success', 'Backup restored successfully')
      else toast('error', json.error ?? 'Restore failed')
    } catch {
      toast('error', 'Network error during restore')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-3">
        <RotateCcw size={28} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-heading text-xl text-sbc-black dark:text-white tracking-widest">RESTORE FROM BACKUP</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Restore service teams, members, reports, and settings from a backup file. User accounts are not overwritten.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-400">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>
          <strong>Warning:</strong> This will overwrite existing data where IDs match. This cannot be undone.
        </span>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-sbc-grey dark:border-white/10 rounded-lg p-6 text-center cursor-pointer hover:border-sbc-red/40 transition-colors"
      >
        <FileJson size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        {file ? (
          <p className="text-sm text-sbc-black dark:text-white font-medium">{file.name}</p>
        ) : (
          <p className="text-sm text-gray-400">Click to select a .json backup file</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null) }}
        />
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="accent-sbc-red mt-0.5"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          I understand this will overwrite existing data and cannot be undone.
        </span>
      </label>

      {result && (
        <div className={`p-3 rounded text-xs ${result.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-sbc-red'}`}>
          {result.success ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-medium"><CheckCircle size={13} /> Restore completed</div>
              {result.restored && Object.entries(result.restored).map(([k, v]) => (
                <p key={k}>{k}: {v} records</p>
              ))}
            </div>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}

      <button
        onClick={handleRestore}
        disabled={!file || !confirmed || loading}
        className="flex items-center gap-2 px-4 py-2 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
        Restore Backup
      </button>
    </div>
  )
}

// ─── Activity Log Card ────────────────────────────────────────────────────────

const ACTION_FILTER_OPTIONS = [
  'ALL',
  'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED',
  'REPORT_SUBMITTED', 'REPORT_SAVED_DRAFT',
  'TEAM_CREATED', 'TEAM_UPDATED',
  'MEMBER_ADDED', 'MEMBER_UPDATED',
  'BACKUP_DOWNLOADED', 'BACKUP_RESTORED',
  'SMTP_SETTINGS_UPDATED', 'PERIOD_LOCKED', 'PERIOD_UNLOCKED', 'REMINDER_SENT',
]

function ActivityLogCard({ logs }: { logs: ActivityEntry[] }) {
  const [filter, setFilter] = useState('ALL')

  const filtered = filter === 'ALL' ? logs : logs.filter((l) => l.action === filter)

  function exportLogs() {
    const csv = [
      ['Date', 'User', 'Action', 'Description', 'Entity Type', 'Entity ID'].join(','),
      ...filtered.map((l) => [
        new Date(l.createdAt).toISOString(),
        l.user ? `${l.user.firstName} ${l.user.lastName ?? ''}`.trim() : 'System',
        l.action,
        `"${l.description.replace(/"/g, '""')}"`,
        l.entityType ?? '',
        l.entityId ?? '',
      ].join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sbc-activity-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-sbc-grey dark:border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <History size={18} className="text-gray-400" />
          <h3 className="font-heading text-xl text-sbc-black dark:text-white tracking-widest">ACTIVITY LOG</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs bg-sbc-grey dark:bg-zinc-700 border-0 rounded px-2 py-1.5 text-sbc-black dark:text-white outline-none"
          >
            {ACTION_FILTER_OPTIONS.map((a) => <option key={a} value={a}>{a === 'ALL' ? 'All Actions' : a.replace(/_/g, ' ')}</option>)}
          </select>
          <button
            onClick={exportLogs}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-sbc-black dark:hover:text-white border border-sbc-grey dark:border-white/10 rounded px-3 py-1.5 transition-colors"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
              {['Date/Time','User','Action','Description'].map((h) => (
                <th key={h} className="text-left px-4 py-3 uppercase tracking-wider text-gray-500 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No activity records.</td></tr>
            ) : filtered.map((log) => (
              <tr key={log.id} className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5">
                <td className="px-4 py-2.5 text-gray-500 dark:text-gray-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {log.user ? `${log.user.firstName} ${log.user.lastName ?? ''}`.trim() : '—'}
                </td>
                <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {log.action.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-2.5 text-gray-500 dark:text-gray-500 max-w-xs truncate">
                  {log.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BackupClient({ lastBackupAt, activityLogs }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FullBackupCard lastBackupAt={lastBackupAt} />
        <ReportsExportCard />
        <RestoreCard />
      </div>
      <ActivityLogCard logs={activityLogs} />
    </div>
  )
}
