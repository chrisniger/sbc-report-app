'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import type { Control, FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Edit, MoreHorizontal, Loader2, KeyRound, UserX } from 'lucide-react'
import Modal from '@/components/ui/Modal'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string
  firstName: string
  lastName: string | null
  username: string
  email: string | null
  phone: string | null
  roles: string[]
  isActive: boolean
  mustChangePassword: boolean
  hodProfile: {
    id: string
    hodName: string
    serviceTeams: { id: string; name: string }[]
    supervisor: { id: string; pastorName: string } | null
  } | null
  pastorProfile: {
    id: string
    pastorName: string
    head: { id: string; headName: string } | null
  } | null
  headProfile: { id: string; headName: string } | null
}

export interface TeamOption { id: string; name: string }
export interface PastorOption { id: string; pastorName: string; userId: string }
export interface HeadOption { id: string; headName: string; userId: string }

interface Props {
  initialUsers: UserRecord[]
  allTeams: TeamOption[]
  allPastors: PastorOption[]
  allHeads: HeadOption[]
  currentUserId: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES = ['ADMIN', 'HEAD_OF_SUPERVISOR', 'SUPERVISOR_PASTOR', 'HOD'] as const
type RoleKey = typeof ALL_ROLES[number]

const ROLE_LABELS: Record<RoleKey, string> = {
  ADMIN: 'Admin',
  HEAD_OF_SUPERVISOR: 'Head of Supervisor',
  SUPERVISOR_PASTOR: 'Supervisor Pastor',
  HOD: 'HOD',
}

const ROLE_COLORS: Record<RoleKey, string> = {
  ADMIN: 'bg-sbc-red/10 text-sbc-red border border-sbc-red/20',
  HEAD_OF_SUPERVISOR: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
  SUPERVISOR_PASTOR: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  HOD: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
}

const AVATAR_COLORS: Record<RoleKey, string> = {
  ADMIN: 'bg-sbc-red text-white',
  HEAD_OF_SUPERVISOR: 'bg-purple-600 text-white',
  SUPERVISOR_PASTOR: 'bg-blue-600 text-white',
  HOD: 'bg-green-600 text-white',
}

const FILTER_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HEAD_OF_SUPERVISOR', label: 'Head of Supervisor' },
  { value: 'SUPERVISOR_PASTOR', label: 'Supervisor Pastor' },
  { value: 'HOD', label: 'HOD' },
]

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const addUserSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  username: z.string().min(2, 'Min 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string().min(1, 'Required'),
  roles: z.array(z.string()).min(1, 'Select at least one role'),
  teamIds: z.array(z.string()).optional(),
  supervisorId: z.string().optional().or(z.literal('')),
  headId: z.string().optional().or(z.literal('')),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const editUserSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  username: z.string().min(2, 'Min 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(8, 'Min 8 characters if changing').optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
  roles: z.array(z.string()).min(1, 'Select at least one role'),
  teamIds: z.array(z.string()).optional(),
  supervisorId: z.string().optional().or(z.literal('')),
  headId: z.string().optional().or(z.literal('')),
}).refine((d) => !d.password || d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type AddFormValues = z.infer<typeof addUserSchema>
type EditFormValues = z.infer<typeof editUserSchema>

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red'
const labelCls =
  'block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium'
const errCls = 'text-sbc-red text-xs mt-1'

// ─── Role-conditional fields component ────────────────────────────────────────

function RoleConditionalFields({
  watchedRoles,
  control,
  allTeams,
  allPastors,
  allHeads,
}: {
  watchedRoles: string[]
  control: Control<FieldValues>
  allTeams: TeamOption[]
  allPastors: PastorOption[]
  allHeads: HeadOption[]
}) {
  const isHod = watchedRoles.includes('HOD')
  const isPastor = watchedRoles.includes('SUPERVISOR_PASTOR')

  return (
    <>
      {isHod && (
        <>
          <div>
            <label className={labelCls}>Service Teams (for this HOD)</label>
            <Controller
              name="teamIds"
              control={control}
              defaultValue={[]}
              render={({ field }) => (
                <div className="border border-sbc-grey dark:border-white/10 rounded p-3 space-y-2 max-h-36 overflow-y-auto">
                  {allTeams.length === 0 ? (
                    <p className="text-xs text-gray-400">No teams available</p>
                  ) : (
                    allTeams.map((team) => (
                      <label key={team.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          value={team.id}
                          checked={(field.value ?? []).includes(team.id)}
                          onChange={(e) => {
                            const current = field.value ?? []
                            field.onChange(
                              e.target.checked
                                ? [...current, team.id]
                                : current.filter((id: string) => id !== team.id)
                            )
                          }}
                          className="accent-sbc-red"
                        />
                        <span className="text-sm text-sbc-black dark:text-white">{team.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            />
          </div>

          <div>
            <label className={labelCls}>Supervisor Pastor (optional)</label>
            <Controller
              name="supervisorId"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <select {...field} className={inputCls}>
                  <option value="">— None —</option>
                  {allPastors.map((p) => (
                    <option key={p.id} value={p.id}>{p.pastorName}</option>
                  ))}
                </select>
              )}
            />
          </div>
        </>
      )}

      {isPastor && (
        <div>
          <label className={labelCls}>Head of Supervisor (optional)</label>
          <Controller
            name="headId"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <select {...field} className={inputCls}>
                <option value="">— None —</option>
                {allHeads.map((h) => (
                  <option key={h.id} value={h.id}>{h.headName}</option>
                ))}
              </select>
            )}
          />
        </div>
      )}
    </>
  )
}

// ─── Add User Modal ────────────────────────────────────────────────────────────

function AddUserModal({
  onClose,
  onSuccess,
  allTeams,
  allPastors,
  allHeads,
}: {
  onClose: () => void
  onSuccess: () => void
  allTeams: TeamOption[]
  allPastors: PastorOption[]
  allHeads: HeadOption[]
}) {
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AddFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { roles: [], teamIds: [] },
  })

  const watchedRoles = watch('roles') ?? []

  async function onSubmit(values: AddFormValues) {
    setServerError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        supervisorId: values.supervisorId?.trim() || undefined,
        headId: values.headId?.trim() || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error ?? 'Something went wrong'); return }
    onSuccess()
  }

  return (
    <Modal title="ADD USER" onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First Name <span className="text-sbc-red">*</span></label>
              <input {...register('firstName')} className={inputCls} placeholder="First" />
              {errors.firstName && <p className={errCls}>{errors.firstName.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-sbc-red">*</span></label>
              <input {...register('lastName')} className={inputCls} placeholder="Last" />
              {errors.lastName && <p className={errCls}>{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Username <span className="text-sbc-red">*</span></label>
            <input {...register('username')} className={inputCls} placeholder="unique username" autoComplete="off" />
            {errors.username && <p className={errCls}>{errors.username.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input {...register('email')} type="email" className={inputCls} placeholder="optional" />
              {errors.email && <p className={errCls}>{errors.email.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input {...register('phone')} type="tel" className={inputCls} placeholder="optional" />
              {errors.phone && <p className={errCls}>{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Password <span className="text-sbc-red">*</span></label>
              <input {...register('password')} type="password" className={inputCls} autoComplete="new-password" />
              {errors.password && <p className={errCls}>{errors.password.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Confirm Password <span className="text-sbc-red">*</span></label>
              <input {...register('confirmPassword')} type="password" className={inputCls} autoComplete="new-password" />
              {errors.confirmPassword && <p className={errCls}>{errors.confirmPassword.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Role(s) <span className="text-sbc-red">*</span></label>
            <div className="flex flex-wrap gap-3">
              {ALL_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={role}
                    {...register('roles')}
                    className="accent-sbc-red"
                  />
                  <span className="text-sm text-sbc-black dark:text-white">{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
            {errors.roles && <p className={errCls}>{errors.roles.message}</p>}
          </div>

          <RoleConditionalFields
            watchedRoles={watchedRoles}
            control={control as unknown as Control<FieldValues>}
            allTeams={allTeams}
            allPastors={allPastors}
            allHeads={allHeads}
          />

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
            Create User
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({
  user,
  onClose,
  onSuccess,
  allTeams,
  allPastors,
  allHeads,
  currentUserId,
}: {
  user: UserRecord
  onClose: () => void
  onSuccess: () => void
  allTeams: TeamOption[]
  allPastors: PastorOption[]
  allHeads: HeadOption[]
  currentUserId: string
}) {
  const [serverError, setServerError] = useState('')
  const [resettingPw, setResettingPw] = useState(false)
  const isSelf = user.id === currentUserId

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName ?? '',
      username: user.username,
      email: user.email ?? '',
      phone: user.phone ?? '',
      password: '',
      confirmPassword: '',
      roles: user.roles as string[],
      teamIds: user.hodProfile?.serviceTeams.map((t) => t.id) ?? [],
      supervisorId: user.hodProfile?.supervisor?.id ?? '',
      headId: user.pastorProfile?.head?.id ?? '',
    },
  })

  const watchedRoles = watch('roles') ?? []

  async function onSubmit(values: EditFormValues) {
    setServerError('')
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        password: values.password?.trim() || undefined,
        confirmPassword: undefined,
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        supervisorId: values.supervisorId?.trim() || null,
        headId: values.headId?.trim() || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error ?? 'Something went wrong'); return }
    onSuccess()
  }

  async function handleResetPassword() {
    if (!confirm('Send a temporary password to this user?')) return
    setResettingPw(true)
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetPassword: true }),
    })
    const json = await res.json()
    setResettingPw(false)
    if (!res.ok) { setServerError(json.error ?? 'Failed'); return }
    alert(user.email ? 'Temporary password sent to user email.' : 'Password reset. No email on file — check logs.')
  }

  return (
    <Modal title={`EDIT USER — ${user.username}`} onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
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
            <label className={labelCls}>Username <span className="text-sbc-red">*</span></label>
            <input
              {...register('username')}
              className={inputCls}
              disabled={isSelf}
              title={isSelf ? 'Cannot change your own username' : undefined}
            />
            {errors.username && <p className={errCls}>{errors.username.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input {...register('email')} type="email" className={inputCls} />
              {errors.email && <p className={errCls}>{errors.email.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input {...register('phone')} type="tel" className={inputCls} />
              {errors.phone && <p className={errCls}>{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>New Password <span className="text-gray-400 normal-case">(leave blank to keep)</span></label>
              <input {...register('password')} type="password" className={inputCls} autoComplete="new-password" />
              {errors.password && <p className={errCls}>{errors.password.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input {...register('confirmPassword')} type="password" className={inputCls} autoComplete="new-password" />
              {errors.confirmPassword && <p className={errCls}>{errors.confirmPassword.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Role(s) <span className="text-sbc-red">*</span></label>
            <div className="flex flex-wrap gap-3">
              {ALL_ROLES.map((role) => (
                <label key={role} className={`flex items-center gap-2 ${isSelf && role === 'ADMIN' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    value={role}
                    {...register('roles')}
                    disabled={isSelf && role === 'ADMIN'}
                    className="accent-sbc-red"
                  />
                  <span className="text-sm text-sbc-black dark:text-white">{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
            {errors.roles && <p className={errCls}>{errors.roles.message}</p>}
          </div>

          <RoleConditionalFields
            watchedRoles={watchedRoles}
            control={control as unknown as Control<FieldValues>}
            allTeams={allTeams}
            allPastors={allPastors}
            allHeads={allHeads}
          />

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resettingPw}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-sbc-black dark:hover:text-white border border-sbc-grey dark:border-white/10 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {resettingPw ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
              Reset Password
            </button>
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

// ─── User Card ────────────────────────────────────────────────────────────────

function UserCard({
  user,
  onEdit,
  onDeactivate,
  currentUserId,
}: {
  user: UserRecord
  onEdit: (u: UserRecord) => void
  onDeactivate: (u: UserRecord) => void
  currentUserId: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const primaryRole = user.roles[0] as RoleKey | undefined
  const avatarColor = primaryRole ? AVATAR_COLORS[primaryRole] : 'bg-zinc-400 text-white'
  const initials = `${user.firstName[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U'

  const subtitle = user.hodProfile
    ? user.hodProfile.serviceTeams.map((t) => t.name).join(', ') || 'No teams'
    : user.email ?? user.phone ?? '—'

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 flex flex-col gap-3 border-l-4 ${user.isActive ? 'border-transparent' : 'border-gray-300 dark:border-zinc-600 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${avatarColor}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sbc-black dark:text-white text-sm truncate">
            {user.firstName} {user.lastName}
            {!user.isActive && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
          </p>
          <p className="text-xs text-gray-400 truncate">@{user.username}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {user.roles.map((role) => (
          <span
            key={role}
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${ROLE_COLORS[role as RoleKey] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {ROLE_LABELS[role as RoleKey] ?? role}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-sbc-grey/50 dark:border-white/5">
        <button
          onClick={() => onEdit(user)}
          className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-sbc-black dark:hover:text-white transition-colors"
        >
          <Edit size={12} />
          Edit
        </button>

        <div className="relative ml-auto">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-sbc-black dark:hover:text-white transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded shadow-lg w-36 z-10">
              <button
                onClick={() => { setMenuOpen(false); onDeactivate(user) }}
                disabled={user.id === currentUserId || !user.isActive}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <UserX size={12} />
                Deactivate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UsersClient({
  initialUsers,
  allTeams,
  allPastors,
  allHeads,
  currentUserId,
}: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState<UserRecord | null>(null)

  const filtered = useMemo(() => {
    let list = initialUsers
    if (filter !== 'ALL') {
      list = list.filter((u) => u.roles.includes(filter))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          (u.lastName ?? '').toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [initialUsers, filter, search])

  function refresh() { router.refresh() }

  async function handleDeactivate(user: UserRecord) {
    if (!confirm(`Deactivate user "${user.username}"? They will no longer be able to log in.`)) return
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) refresh()
    else {
      const json = await res.json()
      alert(json.error ?? 'Failed to deactivate user')
    }
  }

  return (
    <>
      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); refresh() }}
          allTeams={allTeams}
          allPastors={allPastors}
          allHeads={allHeads}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => { setEditUser(null); refresh() }}
          allTeams={allTeams}
          allPastors={allPastors}
          allHeads={allHeads}
          currentUserId={currentUserId}
        />
      )}

      <div className="space-y-4">
        {/* Header row */}
        <div className="group flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === opt.value
                    ? 'bg-sbc-red text-white'
                    : 'bg-sbc-grey dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search name, username, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-sbc-grey dark:border-white/10 rounded focus:outline-none focus:border-sbc-red text-sbc-black dark:text-white placeholder:text-gray-400 w-52"
            />
            <button
              onClick={() => setShowAdd(true)}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded transition-all duration-150"
            >
              <UserPlus size={13} />
              Add User
            </button>
          </div>
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm px-6 py-16 text-center text-gray-400 text-sm">
            {search ? 'No users match your search.' : 'No users found.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={setEditUser}
                onDeactivate={handleDeactivate}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">
          Showing {filtered.length} of {initialUsers.length} users
        </p>
      </div>
    </>
  )
}
