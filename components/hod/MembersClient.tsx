'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Upload, X, Loader2, Download, CheckCircle, AlertCircle, Pencil } from 'lucide-react'
import { ABUJA_LOCATIONS } from '@/lib/abuja-locations'

export interface TeamMember {
  id: string
  fullName: string
  phone: string
  homeLocation: string | null
}

export interface TeamWithMembers {
  id: string
  name: string
  members: TeamMember[]
}

interface Props {
  teams: TeamWithMembers[]
  openAddMember?: boolean
}

// ─── Add Member Modal ────────────────────────────────────────────────────────

interface AddModalProps {
  teams: TeamWithMembers[]
  defaultTeamId: string
  onClose: () => void
  onSuccess: () => void
}

function AddMemberModal({ teams, defaultTeamId, onClose, onSuccess }: AddModalProps) {
  const [teamId, setTeamId] = useState(defaultTeamId)
  const [phone, setPhone] = useState('')
  const [phoneState, setPhoneState] = useState<'idle' | 'checking' | 'exists' | 'new'>('idle')
  const [existingName, setExistingName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [homeLocation, setHomeLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function checkPhone() {
    const val = phone.trim()
    if (!val) return
    setPhoneState('checking')
    setError('')
    try {
      const res = await fetch(`/api/members/check-phone?phone=${encodeURIComponent(val)}`)
      const data = await res.json()
      if (data.exists) {
        setExistingName(data.member.fullName)
        setPhoneState('exists')
      } else {
        setPhoneState('new')
      }
    } catch {
      setPhoneState('idle')
    }
  }

  async function handleSubmit() {
    setError('')
    const val = phone.trim()
    if (!val || !teamId) { setError('Phone and team are required.'); return }
    if (phoneState === 'new' && (!firstName.trim() || !lastName.trim())) {
      setError('First name and last name are required for new members.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: val,
          teamId,
          firstName: firstName.trim() || existingName.split(' ')[0] || 'Unknown',
          lastName: lastName.trim() || existingName.split(' ').slice(1).join(' ') || 'Unknown',
          homeLocation: homeLocation.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong.')
        setSubmitting(false)
        return
      }
      onSuccess()
    } catch {
      setError('Network error. Try again.')
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red'
  const labelCls = 'block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sbc-grey dark:border-white/10">
          <h3 className="font-heading text-lg text-sbc-black dark:text-white tracking-widest">ADD MEMBER</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-sbc-black dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Team selector (only if multiple teams) */}
          {teams.length > 1 && (
            <div>
              <label className={labelCls}>Service Team <span className="text-sbc-red">*</span></label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className={inputCls}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Phone */}
          <div>
            <label className={labelCls}>Phone Number <span className="text-sbc-red">*</span></label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneState('idle') }}
                onBlur={checkPhone}
                placeholder="e.g. 08012345678"
                className={`${inputCls} flex-1`}
              />
              {phoneState === 'checking' && (
                <span className="flex items-center pr-1">
                  <Loader2 size={15} className="animate-spin text-gray-400" />
                </span>
              )}
            </div>
          </div>

          {/* Existing member notice */}
          {phoneState === 'exists' && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>
                <strong>{existingName}</strong> already exists. They will be added to this team.
              </span>
            </div>
          )}

          {/* New member fields */}
          {phoneState === 'new' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First Name <span className="text-sbc-red">*</span></label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Last Name <span className="text-sbc-red">*</span></label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Home Location</label>
                <select
                  value={homeLocation}
                  onChange={(e) => setHomeLocation(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select location —</option>
                  {ABUJA_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && (
            <p className="text-sbc-red text-xs">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-sbc-grey dark:border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || phoneState === 'idle' || phoneState === 'checking'}
            className="flex items-center gap-2 px-5 py-2 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            {phoneState === 'exists' ? 'Add to Team' : 'Register & Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Member Modal ───────────────────────────────────────────────────────

interface EditModalProps {
  member: TeamMember
  onClose: () => void
  onSuccess: () => void
}

function EditMemberModal({ member, onClose, onSuccess }: EditModalProps) {
  const [firstName, setFirstName] = useState(member.fullName.split(' ')[0] ?? '')
  const [lastName, setLastName] = useState(member.fullName.split(' ').slice(1).join(' ') ?? '')
  const [homeLocation, setHomeLocation] = useState(member.homeLocation ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          homeLocation: homeLocation.trim() || '',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong.')
        setSubmitting(false)
        return
      }
      onSuccess()
    } catch {
      setError('Network error. Try again.')
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red'
  const labelCls = 'block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sbc-grey dark:border-white/10">
          <h3 className="font-heading text-lg text-sbc-black dark:text-white tracking-widest">EDIT MEMBER</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-sbc-black dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First Name <span className="text-sbc-red">*</span></label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-sbc-red">*</span></label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Phone (read-only)</label>
            <input
              type="text"
              value={member.phone}
              readOnly
              className={`${inputCls} opacity-50 cursor-not-allowed`}
            />
          </div>

          <div>
            <label className={labelCls}>Home Location</label>
            <select
              value={homeLocation}
              onChange={(e) => setHomeLocation(e.target.value)}
              className={inputCls}
            >
              <option value="">— Select location —</option>
              {ABUJA_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sbc-red text-xs">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-sbc-grey dark:border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CSV Upload Modal ────────────────────────────────────────────────────────

interface CsvModalProps {
  onClose: () => void
  onSuccess: () => void
}

function CsvUploadModal({ onClose, onSuccess }: CsvModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ added: number; skipped: number; errors: string[] } | null>(null)
  const [error, setError] = useState('')

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')
    setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/members/csv', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Upload failed.')
        setUploading(false)
        return
      }
      setResult(json)
      if (json.added > 0 || json.skipped > 0) onSuccess()
    } catch {
      setError('Network error. Try again.')
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sbc-grey dark:border-white/10">
          <h3 className="font-heading text-lg text-sbc-black dark:text-white tracking-widest">UPLOAD CSV</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-sbc-black dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload a CSV file with member data.
            </p>
            <a
              href="/api/members/template"
              download
              className="flex items-center gap-1.5 text-xs text-sbc-red hover:underline"
            >
              <Download size={12} />
              Download template
            </a>
          </div>

          <div
            className="border-2 border-dashed border-sbc-grey dark:border-white/10 rounded-lg p-6 text-center cursor-pointer hover:border-sbc-red/40 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            {file ? (
              <p className="text-sm text-sbc-black dark:text-white font-medium">{file.name}</p>
            ) : (
              <p className="text-sm text-gray-400">Click to select a CSV file</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {result && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle size={14} />
                <span>{result.added} member{result.added !== 1 ? 's' : ''} added</span>
              </div>
              {result.skipped > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {result.skipped} existing member{result.skipped !== 1 ? 's' : ''} assigned to team
                </p>
              )}
              {result.errors.length > 0 && (
                <div className="mt-2 text-xs text-sbc-red space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sbc-red text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-sbc-grey dark:border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-5 py-2 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading && <Loader2 size={13} className="animate-spin" />}
              Upload
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Client Component ───────────────────────────────────────────────────

export default function MembersClient({ teams, openAddMember = false }: Props) {
  const router = useRouter()
  const [activeTeamId, setActiveTeamId] = useState(teams[0]?.id ?? '')
  const [showAdd, setShowAdd] = useState(openAddMember)
  const [showCsv, setShowCsv] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)

  const activeTeam = teams.find((t) => t.id === activeTeamId)

  function closeAddMember() {
    setShowAdd(false)
    router.replace('/hod/members', { scroll: false })
  }

  function handleSuccess() {
    router.refresh()
  }

  return (
    <>
      {/* Modals */}
      {showAdd && (
        <AddMemberModal
          teams={teams}
          defaultTeamId={activeTeamId}
          onClose={closeAddMember}
          onSuccess={() => { closeAddMember(); handleSuccess() }}
        />
      )}
      {showCsv && (
        <CsvUploadModal
          onClose={() => setShowCsv(false)}
          onSuccess={handleSuccess}
        />
      )}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={() => { setEditingMember(null); handleSuccess() }}
        />
      )}

      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Team filter tabs */}
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setActiveTeamId(team.id)}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${activeTeamId === team.id
                    ? 'bg-sbc-red text-white'
                    : 'bg-sbc-grey dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'}
                `}
              >
                {team.name}
                <span className="ml-1.5 text-xs opacity-70">({team.members.length})</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCsv(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sbc-grey dark:border-white/10 text-sm text-gray-600 dark:text-gray-300 rounded hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
            >
              <Upload size={14} />
              Upload CSV
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sbc-red text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              <UserPlus size={14} />
              Add Member
            </button>
          </div>
        </div>

        {/* Members table */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          {!activeTeam || activeTeam.members.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-400 text-sm">
              {activeTeam ? 'No members in this team yet.' : 'Select a team to view members.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">
                      Name
                    </th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">
                      Phone
                    </th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium hidden sm:table-cell">
                      Home Location
                    </th>
                    <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeTeam.members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-5 py-3 text-sbc-black dark:text-white font-medium">
                        {member.fullName}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono">
                        {member.phone}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs hidden sm:table-cell">
                        {member.homeLocation ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setEditingMember(member)}
                          className="p-1.5 text-gray-400 hover:text-sbc-red transition-colors"
                          title="Edit member"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400">
          Showing {activeTeam?.members.length ?? 0} member{activeTeam?.members.length !== 1 ? 's' : ''} in {activeTeam?.name ?? '—'}
        </p>
      </div>
    </>
  )
}
