'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Edit, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { ABUJA_LOCATIONS } from '@/lib/abuja-locations'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemberRecord {
  id: string
  fullName: string
  firstName: string
  lastName: string
  phone: string
  homeLocation: string | null
  email: string | null
  isActive: boolean
  teamAssignments: {
    id: string
    teamId: string
    team: { id: string; name: string }
  }[]
  reportGrades: { averageScore: number | null }[]
  createdBy: { firstName: string; lastName: string | null } | null
}

export interface TeamFilterOption {
  id: string
  name: string
}

interface Props {
  initialMembers: MemberRecord[]
  allTeams: TeamFilterOption[]
}

const PAGE_SIZE = 20

// ─── Schemas ──────────────────────────────────────────────────────────────────

const editMemberSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().min(7, 'Valid phone required'),
  homeLocation: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})

const reassignSchema = z.object({
  teamId: z.string().min(1, 'Select a team'),
})

type EditFormValues = z.infer<typeof editMemberSchema>
type ReassignFormValues = z.infer<typeof reassignSchema>

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red'
const labelCls =
  'block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium'
const errCls = 'text-sbc-red text-xs mt-1'

// ─── Edit Member Modal ────────────────────────────────────────────────────────

function EditMemberModal({
  member,
  onClose,
  onSuccess,
}: {
  member: MemberRecord
  onClose: () => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone,
      homeLocation: member.homeLocation ?? '',
      email: member.email ?? '',
    },
  })

  async function onSubmit(values: EditFormValues) {
    setServerError('')
    const res = await fetch(`/api/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phone: values.phone.trim(),
        homeLocation: values.homeLocation?.trim() || null,
        email: values.email?.trim() || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error ?? 'Something went wrong'); return }
    onSuccess()
  }

  return (
    <Modal title={`EDIT MEMBER — ${member.fullName}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First Name <span className="text-sbc-red">*</span></label>
              <input {...register('firstName')} className={inputCls} />
              {errors.firstName && <p className={errCls}>{errors.firstName.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-sbc-red">*</span></label>
              <input {...register('lastName')} className={inputCls} />
              {errors.lastName && <p className={errCls}>{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Phone <span className="text-sbc-red">*</span></label>
            <input {...register('phone')} type="tel" className={inputCls} />
            {errors.phone && <p className={errCls}>{errors.phone.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Home Location</label>
            <select {...register('homeLocation')} className={inputCls}>
              <option value="">— Select location —</option>
              {ABUJA_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Email</label>
            <input {...register('email')} type="email" className={inputCls} />
            {errors.email && <p className={errCls}>{errors.email.message}</p>}
          </div>

          {serverError && <p className={errCls}>{serverError}</p>}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-sbc-grey dark:border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && <Loader2 size={13} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Reassign Team Modal ──────────────────────────────────────────────────────

function ReassignModal({
  member,
  allTeams,
  onClose,
  onSuccess,
}: {
  member: MemberRecord
  allTeams: TeamFilterOption[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState('')
  const currentTeamIds = member.teamAssignments.map((a) => a.teamId)
  const availableTeams = allTeams.filter((t) => !currentTeamIds.includes(t.id))

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReassignFormValues>({
    resolver: zodResolver(reassignSchema),
    defaultValues: { teamId: '' },
  })

  async function onSubmit(values: ReassignFormValues) {
    setServerError('')
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: member.phone,
        teamId: values.teamId,
        firstName: member.firstName,
        lastName: member.lastName,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error ?? 'Something went wrong'); return }
    onSuccess()
  }

  async function removeFromTeam(teamId: string, teamName: string) {
    if (!confirm(`Remove ${member.fullName} from "${teamName}"?`)) return
    const res = await fetch(`/api/members/${member.id}/teams/${teamId}`, { method: 'DELETE' })
    if (res.ok) { onSuccess() }
    else {
      const json = await res.json().catch(() => ({}))
      setServerError(json.error ?? 'Failed to remove from team')
    }
  }

  return (
    <Modal title={`TEAM ASSIGNMENTS — ${member.fullName}`} onClose={onClose}>
      <div className="p-5 space-y-4">
        <div>
          <p className={labelCls}>Current Teams</p>
          {member.teamAssignments.length === 0 ? (
            <p className="text-sm text-gray-400">No team assignments</p>
          ) : (
            <div className="space-y-1">
              {member.teamAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-700 rounded px-3 py-2">
                  <span className="text-sm text-sbc-black dark:text-white">{a.team.name}</span>
                  <button
                    onClick={() => removeFromTeam(a.teamId, a.team.name)}
                    className="text-gray-400 hover:text-sbc-red transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {availableTeams.length > 0 && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className={labelCls}>Add to Team</label>
              <select {...register('teamId')} className={inputCls}>
                <option value="">— Select team —</option>
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {errors.teamId && <p className={errCls}>{errors.teamId.message}</p>}
            </div>

            {serverError && <p className={errCls}>{serverError}</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                Add to Team
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex justify-end px-5 py-4 border-t border-sbc-grey dark:border-white/10">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors">
          Close
        </button>
      </div>
    </Modal>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MembersAdminClient({ initialMembers, allTeams }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [editMember, setEditMember] = useState<MemberRecord | null>(null)
  const [reassignMember, setReassignMember] = useState<MemberRecord | null>(null)

  const filtered = useMemo(() => {
    let list = initialMembers
    if (teamFilter !== 'ALL') {
      list = list.filter((m) => m.teamAssignments.some((a) => a.teamId === teamFilter))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.phone.includes(q)
      )
    }
    return list
  }, [initialMembers, teamFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function refresh() { router.refresh() }

  function avgScore(member: MemberRecord): string {
    const scores = member.reportGrades
      .map((g) => g.averageScore)
      .filter((s): s is number => s !== null)
    if (!scores.length) return '—'
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  }

  return (
    <>
      {editMember && (
        <EditMemberModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSuccess={() => { setEditMember(null); refresh() }}
        />
      )}
      {reassignMember && (
        <ReassignModal
          member={reassignMember}
          allTeams={allTeams}
          onClose={() => setReassignMember(null)}
          onSuccess={() => { setReassignMember(null); refresh() }}
        />
      )}

      <div className="space-y-4">
        {/* Controls */}
        <div className="group flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setTeamFilter('ALL'); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                teamFilter === 'ALL'
                  ? 'bg-sbc-red text-white'
                  : 'bg-sbc-grey dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
              }`}
            >
              All Teams
            </button>
            {allTeams.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTeamFilter(t.id); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  teamFilter === t.id
                    ? 'bg-sbc-red text-white'
                    : 'bg-sbc-grey dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search name or phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-sbc-grey dark:border-white/10 rounded focus:outline-none focus:border-sbc-red text-sbc-black dark:text-white placeholder:text-gray-400 w-48"
            />
            <button
              onClick={() => router.push('/hod/members')}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded transition-all duration-150"
            >
              <UserPlus size={13} />
              Add Member
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                  {['Full Name', 'Phone', 'Location', 'Service Team(s)', 'Created By', 'Avg Score', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                      {search ? 'No members match your search.' : 'No members found.'}
                    </td>
                  </tr>
                ) : (
                  paginated.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-sbc-black dark:text-white whitespace-nowrap">
                        {member.fullName}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono">
                        {member.phone}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {member.homeLocation ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {member.teamAssignments.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">None</span>
                          ) : (
                            member.teamAssignments.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex px-1.5 py-0.5 bg-sbc-grey dark:bg-white/10 text-sbc-black dark:text-white text-[11px] rounded"
                              >
                                {a.team.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {member.createdBy
                          ? `${member.createdBy.firstName} ${member.createdBy.lastName ?? ''}`.trim()
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm font-medium text-sbc-black dark:text-white">
                          {avgScore(member)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditMember(member)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors"
                          >
                            <Edit size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => setReassignMember(member)}
                            className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          >
                            Teams
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} members
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-sbc-grey dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-sbc-grey dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {totalPages <= 1 && (
          <p className="text-xs text-gray-400">
            Showing {filtered.length} member{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </>
  )
}
