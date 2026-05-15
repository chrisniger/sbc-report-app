'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit, ToggleLeft, Loader2, AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/Modal'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamRecord {
  id: string
  name: string
  description: string | null
  isActive: boolean
  hodId: string | null
  pastorId: string | null
  hod: {
    id: string
    hodName: string
    user: { firstName: string; lastName: string | null }
  } | null
  pastor: {
    id: string
    pastorName: string
    user: { firstName: string; lastName: string | null }
  } | null
  members: { id: string }[]
  reports: {
    id: string
    reportMonth: number
    reportYear: number
    status: string
    createdAt: string
  }[]
}

export interface HodOption {
  id: string
  hodName: string
  userId: string
}

export interface PastorOption {
  id: string
  pastorName: string
  userId: string
}

interface Props {
  initialTeams: TeamRecord[]
  hodOptions: HodOption[]
  pastorOptions: PastorOption[]
  stats: { total: number; assigned: number; unassigned: number; active: number }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const teamSchema = z.object({
  name: z.string().min(1, 'Team name required'),
  description: z.string().optional().or(z.literal('')),
  hodId: z.string().optional().or(z.literal('')),
  pastorId: z.string().optional().or(z.literal('')),
})

type TeamFormValues = z.infer<typeof teamSchema>

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red'
const labelCls =
  'block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium'
const errCls = 'text-sbc-red text-xs mt-1'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Team Form Modal ──────────────────────────────────────────────────────────

function TeamFormModal({
  team,
  hodOptions,
  pastorOptions,
  onClose,
  onSuccess,
}: {
  team?: TeamRecord
  hodOptions: HodOption[]
  pastorOptions: PastorOption[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState('')
  const isEdit = !!team

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: team?.name ?? '',
      description: team?.description ?? '',
      hodId: team?.hodId ?? '',
      pastorId: team?.pastorId ?? '',
    },
  })

  async function onSubmit(values: TeamFormValues) {
    setServerError('')
    const url = isEdit ? `/api/teams/${team!.id}` : '/api/teams'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name.trim(),
        description: values.description?.trim() || null,
        hodId: values.hodId?.trim() || null,
        pastorId: values.pastorId?.trim() || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error ?? 'Something went wrong'); return }
    onSuccess()
  }

  return (
    <Modal title={isEdit ? `EDIT TEAM — ${team!.name}` : 'ADD TEAM'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Team Name <span className="text-sbc-red">*</span></label>
            <input {...register('name')} className={inputCls} placeholder="e.g. Ushering" />
            {errors.name && <p className={errCls}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Assign HOD</label>
            <select {...register('hodId')} className={inputCls}>
              <option value="">— None —</option>
              {hodOptions.map((h) => (
                <option key={h.id} value={h.id}>{h.hodName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Assign Supervisor Pastor</label>
            <select {...register('pastorId')} className={inputCls}>
              <option value="">— None —</option>
              {pastorOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.pastorName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Optional description"
            />
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
            {isEdit ? 'Save Changes' : 'Create Team'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Confirm Deactivate Modal ─────────────────────────────────────────────────

function ConfirmModal({
  team,
  onClose,
  onConfirm,
}: {
  team: TeamRecord
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <Modal title="CONFIRM DEACTIVATE" onClose={onClose} maxWidth="max-w-sm">
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-sbc-black dark:text-white font-medium">
              Deactivate &ldquo;{team.name}&rdquo;?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This team will be hidden from HOD reports. Existing reports will remain intact.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 px-5 py-4 border-t border-sbc-grey dark:border-white/10">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white text-sm font-medium rounded hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Deactivate
        </button>
      </div>
    </Modal>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamsClient({ initialTeams, hodOptions, pastorOptions, stats }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editTeam, setEditTeam] = useState<TeamRecord | null>(null)
  const [deactivateTeam, setDeactivateTeam] = useState<TeamRecord | null>(null)

  function refresh() { router.refresh() }

  async function handleDeactivate(team: TeamRecord) {
    const res = await fetch(`/api/teams/${team.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    if (res.ok) { setDeactivateTeam(null); refresh() }
    else {
      const json = await res.json()
      alert(json.error ?? 'Failed to deactivate team')
    }
  }

  return (
    <>
      {showAdd && (
        <TeamFormModal
          hodOptions={hodOptions}
          pastorOptions={pastorOptions}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); refresh() }}
        />
      )}
      {editTeam && (
        <TeamFormModal
          team={editTeam}
          hodOptions={hodOptions}
          pastorOptions={pastorOptions}
          onClose={() => setEditTeam(null)}
          onSuccess={() => { setEditTeam(null); refresh() }}
        />
      )}
      {deactivateTeam && (
        <ConfirmModal
          team={deactivateTeam}
          onClose={() => setDeactivateTeam(null)}
          onConfirm={() => handleDeactivate(deactivateTeam)}
        />
      )}

      <div className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Teams', value: stats.total },
            { label: 'Assigned to HOD', value: stats.assigned },
            { label: 'Unassigned', value: stats.unassigned },
            { label: 'Active', value: stats.active },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm text-center">
              <p className="font-heading text-2xl text-sbc-black dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table header */}
        <div className="group bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-sbc-grey dark:border-white/10">
            <h2 className="font-heading text-xl text-sbc-black dark:text-white tracking-widest">
              SERVICE TEAMS
            </h2>
            <button
              onClick={() => setShowAdd(true)}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded transition-all duration-150"
            >
              <Plus size={13} />
              Add Team
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                  {['Team Name', 'HOD', 'Supervisor Pastor', 'Members', 'Last Report', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {initialTeams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                      No service teams yet.
                    </td>
                  </tr>
                ) : (
                  initialTeams.map((team) => {
                    const lastReport = team.reports[0]
                    return (
                      <tr
                        key={team.id}
                        className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="px-5 py-3 font-medium text-sbc-black dark:text-white whitespace-nowrap">
                          {team.name}
                        </td>
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs">
                          {team.hod?.hodName ?? <span className="text-gray-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs">
                          {team.pastor?.pastorName ?? <span className="text-gray-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-5 py-3 text-center text-gray-700 dark:text-gray-300 text-xs font-medium">
                          {team.members.length}
                        </td>
                        <td className="px-5 py-3 text-gray-500 dark:text-gray-500 text-xs whitespace-nowrap">
                          {lastReport
                            ? `${MONTHS[lastReport.reportMonth - 1]} ${lastReport.reportYear}`
                            : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            team.isActive
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            {team.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditTeam(team)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors"
                            >
                              <Edit size={12} />
                              Edit
                            </button>
                            {team.isActive && (
                              <button
                                onClick={() => setDeactivateTeam(team)}
                                className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                              >
                                <ToggleLeft size={12} />
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
