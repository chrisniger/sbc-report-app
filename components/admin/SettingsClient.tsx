'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2, Eye, EyeOff, Plus, Trash2, Lock, Unlock,
  Send, ChevronUp, ChevronDown, Edit, AlertTriangle,
} from 'lucide-react'
import Tabs from '@/components/ui/Tabs'
import type { TabDef } from '@/components/ui/Tabs'
import Toggle from '@/components/ui/Toggle'
import Modal from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmtpRecord {
  id: string | null
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  fromDisplay: string
  updatedAt: string | null
  updatedById: string | null
}

export interface NotifRecord {
  id: string
  event: string
  recipientEmail: string
  recipientName: string | null
  serviceTeamId: string | null
  serviceTeamName: string | null
  isActive: boolean
  createdAt: string
}

export interface PeriodRecord {
  id: string
  month: number
  year: number
  deadline: string | null
  isLocked: boolean
  autoReminders: boolean
}

export interface FieldRecord {
  id: string
  formName: string
  fieldLabel: string
  fieldType: string
  fieldOptions: string | null
  isRequired: boolean
  visibleToRoles: string
  fieldOrder: number
  isActive: boolean
}

export interface TeamOption {
  id: string
  name: string
}

interface Props {
  smtp: SmtpRecord | null
  notifications: NotifRecord[]
  periods: PeriodRecord[]
  fields: FieldRecord[]
  teams: TeamOption[]
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red'
const labelCls =
  'block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium'
const errCls = 'text-sbc-red text-xs mt-1'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const EVENTS = ['HOD_REPORT_SUBMITTED','PASTOR_REVIEW_COMPLETED','HEAD_REVIEW_COMPLETED','DEADLINE_REMINDER']
const FIELD_TYPES = ['text','textarea','select','radio','checkbox','number']
const FORM_NAMES = ['HOD_REPORT','PASTOR_REVIEW','MEMBER_FORM'] as const
const FORM_LABELS: Record<string, string> = {
  HOD_REPORT: 'HOD Report Form',
  PASTOR_REVIEW: 'Pastor Review Form',
  MEMBER_FORM: 'Member Form',
}

// ─── TAB 1: SMTP ─────────────────────────────────────────────────────────────

const smtpSchema = z.object({
  host: z.string().min(1, 'Required'),
  port: z.number().int().min(1).max(65535),
  secureStr: z.string(),
  username: z.string().min(1, 'Required'),
  password: z.string().optional().or(z.literal('')),
  fromDisplay: z.string().min(1, 'Required'),
})

type SmtpFormValues = z.infer<typeof smtpSchema>

function SmtpTab({ initial }: { initial: SmtpRecord | null }) {
  const [showPw, setShowPw] = useState(false)
  const [testing, setTesting] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      host: initial?.host ?? 'smtp.hostinger.com',
      port: initial?.port ?? 465,
      secureStr: String(initial?.secure ?? true),
      username: initial?.username ?? '',
      password: initial?.password ?? '',
      fromDisplay: initial?.fromDisplay ?? 'SBC Reports <reports@summitdata.one>',
    },
  })

  async function onSave(values: SmtpFormValues) {
    const res = await fetch('/api/settings/smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, secure: values.secureStr === 'true' }),
    })
    const json = await res.json()
    if (res.ok) toast('success', 'SMTP settings saved')
    else toast('error', json.error ?? 'Failed to save')
  }

  async function testConnection() {
    setTesting(true)
    try {
      const res = await fetch('/api/settings/smtp/test', { method: 'POST' })
      const json = await res.json()
      if (json.success) toast('success', json.message)
      else toast('error', json.message)
    } catch {
      toast('error', 'Test failed — network error')
    }
    setTesting(false)
  }

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-5 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>SMTP Host <span className="text-sbc-red">*</span></label>
          <input {...register('host')} className={inputCls} placeholder="smtp.hostinger.com" />
          {errors.host && <p className={errCls}>{errors.host.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Port <span className="text-sbc-red">*</span></label>
          <input {...register('port', { valueAsNumber: true })} type="number" className={inputCls} />
          {errors.port && <p className={errCls}>{errors.port.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls}>Encryption</label>
        <select {...register('secureStr')} className={inputCls}>
          <option value="true">SSL (Port 465)</option>
          <option value="false">TLS / None (Port 587)</option>
        </select>
      </div>

      <div>
        <label className={labelCls}>SMTP Username <span className="text-sbc-red">*</span></label>
        <input {...register('username')} className={inputCls} autoComplete="off" />
        {errors.username && <p className={errCls}>{errors.username.message}</p>}
      </div>

      <div>
        <label className={labelCls}>
          SMTP Password{' '}
          <span className="normal-case text-gray-400 font-normal">
            (leave blank to keep current)
          </span>
        </label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPw ? 'text' : 'password'}
            className={`${inputCls} pr-10`}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sbc-black dark:hover:text-white"
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div>
        <label className={labelCls}>From Display <span className="text-sbc-red">*</span></label>
        <input {...register('fromDisplay')} className={inputCls} placeholder='SBC Reports <reports@example.com>' />
        {errors.fromDisplay && <p className={errCls}>{errors.fromDisplay.message}</p>}
      </div>

      {initial?.updatedAt && (
        <p className="text-xs text-gray-400">
          Last updated: {new Date(initial.updatedAt).toLocaleString('en-GB')}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting && <Loader2 size={13} className="animate-spin" />}
          Save SMTP Settings
        </button>
        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 border border-sbc-grey dark:border-white/10 text-sm text-gray-600 dark:text-gray-300 rounded hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
        >
          {testing && <Loader2 size={13} className="animate-spin" />}
          Test Connection
        </button>
      </div>
    </form>
  )
}

// ─── TAB 2: Notifications ─────────────────────────────────────────────────────

const notifSchema = z.object({
  event: z.string().min(1, 'Required'),
  recipientEmail: z.string().email('Valid email required'),
  recipientName: z.string().optional().or(z.literal('')),
  serviceTeamId: z.string().optional().or(z.literal('')),
  isActive: z.boolean(),
})

function NotifModal({
  record,
  teams,
  onClose,
  onSuccess,
}: {
  record?: NotifRecord
  teams: TeamOption[]
  onClose: () => void
  onSuccess: (n: NotifRecord) => void
}) {
  const isEdit = !!record
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof notifSchema>>({
    resolver: zodResolver(notifSchema),
    defaultValues: {
      event: record?.event ?? EVENTS[0],
      recipientEmail: record?.recipientEmail ?? '',
      recipientName: record?.recipientName ?? '',
      serviceTeamId: record?.serviceTeamId ?? '',
      isActive: record?.isActive ?? true,
    },
  })

  async function onSubmit(values: z.infer<typeof notifSchema>) {
    const url = isEdit ? `/api/settings/notifications/${record!.id}` : '/api/settings/notifications'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        recipientName: values.recipientName?.trim() || null,
        serviceTeamId: values.serviceTeamId?.trim() || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { toast('error', json.error ?? 'Failed'); return }
    toast('success', isEdit ? 'Notification updated' : 'Notification added')
    onSuccess({ ...values, id: isEdit ? record!.id : json.id, serviceTeamName: null, createdAt: new Date().toISOString() } as NotifRecord)
  }

  return (
    <Modal title={isEdit ? 'EDIT NOTIFICATION' : 'ADD NOTIFICATION'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Event <span className="text-sbc-red">*</span></label>
            <select {...register('event')} className={inputCls}>
              {EVENTS.map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
            </select>
            {errors.event && <p className={errCls}>{errors.event.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Recipient Email <span className="text-sbc-red">*</span></label>
            <input {...register('recipientEmail')} type="email" className={inputCls} />
            {errors.recipientEmail && <p className={errCls}>{errors.recipientEmail.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Recipient Name</label>
            <input {...register('recipientName')} className={inputCls} placeholder="optional" />
          </div>
          <div>
            <label className={labelCls}>Service Team (blank = all teams)</label>
            <select {...register('serviceTeamId')} className={inputCls}>
              <option value="">— All Teams —</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className={labelCls + ' mb-0'}>Active</label>
            <input {...register('isActive')} type="checkbox" className="accent-sbc-red w-4 h-4" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-sbc-grey dark:border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors">
            {isSubmitting && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function NotificationsTab({ initialData, teams }: { initialData: NotifRecord[]; teams: TeamOption[] }) {
  const [records, setRecords] = useState(initialData)
  const [modalRecord, setModalRecord] = useState<NotifRecord | null | 'new'>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this notification recipient?')) return
    const res = await fetch(`/api/settings/notifications/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRecords((prev) => prev.filter((r) => r.id !== id))
      toast('success', 'Recipient deleted')
    } else toast('error', 'Delete failed')
  }

  async function handleToggle(id: string, isActive: boolean) {
    const res = await fetch(`/api/settings/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
    if (res.ok) {
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, isActive } : r))
    } else toast('error', 'Update failed')
  }

  function handleSuccess(n: NotifRecord) {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === n.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = n
        return next
      }
      return [...prev, n]
    })
    setModalRecord(null)
  }

  return (
    <>
      {(modalRecord === 'new' || (modalRecord && typeof modalRecord === 'object')) && (
        <NotifModal
          record={modalRecord === 'new' ? undefined : modalRecord}
          teams={teams}
          onClose={() => setModalRecord(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="space-y-3">
        <div className="group flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">{records.length} recipient rule{records.length !== 1 ? 's' : ''} configured</p>
          <button
            onClick={() => setModalRecord('new')}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded transition-all duration-150"
          >
            <Plus size={13} />
            Add Recipient
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                  {['Event','Email','Name','Team','Active','Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No notification recipients configured.</td></tr>
                ) : records.map((r) => (
                  <tr key={r.id} className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.event.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm text-sbc-black dark:text-white">{r.recipientEmail}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{r.recipientName ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{r.serviceTeamName ?? 'All'}</td>
                    <td className="px-4 py-3">
                      <Toggle checked={r.isActive} onChange={(v) => handleToggle(r.id, v)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModalRecord(r)} className="text-xs text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors"><Edit size={12} /></button>
                        <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── TAB 3: Report Periods ────────────────────────────────────────────────────

function PeriodsTab({ initialData }: { initialData: PeriodRecord[] }) {
  const [periods, setPeriods] = useState(initialData)
  const [adding, setAdding] = useState(false)
  const [newMonth, setNewMonth] = useState(String(new Date().getMonth() + 1))
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()))
  const [reminding, setReminding] = useState<string | null>(null)

  const current = periods[0]

  async function addPeriod() {
    const res = await fetch('/api/settings/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: parseInt(newMonth), year: parseInt(newYear) }),
    })
    const json = await res.json()
    if (!res.ok) { toast('error', json.error ?? 'Failed'); return }
    setPeriods((prev) => [
      { id: json.id, month: parseInt(newMonth), year: parseInt(newYear), deadline: null, isLocked: false, autoReminders: true },
      ...prev,
    ])
    setAdding(false)
    toast('success', 'Period created')
  }

  async function patchPeriod(id: string, data: Partial<PeriodRecord>) {
    const res = await fetch(`/api/settings/periods/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setPeriods((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p))
    } else {
      const json = await res.json()
      toast('error', json.error ?? 'Update failed')
    }
  }

  async function sendReminder(id: string) {
    setReminding(id)
    const res = await fetch(`/api/settings/periods/${id}/remind`, { method: 'POST' })
    const json = await res.json()
    setReminding(null)
    if (res.ok) toast('success', `Reminders sent to ${json.sent} HOD(s)`)
    else toast('error', json.error ?? 'Failed to send reminders')
  }

  return (
    <div className="space-y-4">
      {/* Current period highlight */}
      {current && (
        <div className="bg-sbc-red/5 dark:bg-sbc-red/10 border border-sbc-red/20 rounded-lg px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Period</p>
            <p className="font-heading text-3xl text-sbc-red tracking-widest mt-0.5">
              {MONTHS_FULL[current.month - 1]} {current.year}
            </p>
          </div>
          {current.isLocked && (
            <span className="flex items-center gap-1.5 text-sm text-sbc-red font-medium">
              <Lock size={16} /> Locked
            </span>
          )}
        </div>
      )}

      {/* Add period */}
      <div className="group flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{periods.length} period{periods.length !== 1 ? 's' : ''} configured</p>
        {adding ? (
          <div className="flex items-center gap-2">
            <select value={newMonth} onChange={(e) => setNewMonth(e.target.value)} className="text-xs bg-white dark:bg-zinc-800 border border-sbc-grey dark:border-white/10 rounded px-2 py-1.5 focus:outline-none">
              {MONTHS_FULL.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" value={newYear} onChange={(e) => setNewYear(e.target.value)} className="text-xs w-20 bg-white dark:bg-zinc-800 border border-sbc-grey dark:border-white/10 rounded px-2 py-1.5 focus:outline-none" />
            <button onClick={addPeriod} className="text-xs px-3 py-1.5 bg-sbc-red text-white rounded hover:bg-red-700 transition-colors">Add</button>
            <button onClick={() => setAdding(false)} className="text-xs text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded transition-all duration-150"
          >
            <Plus size={13} />
            Add Period
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                {['Period','Deadline','Locked','Auto Reminders','Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">No periods configured.</td></tr>
              ) : periods.map((p) => (
                <tr key={p.id} className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-sbc-black dark:text-white whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      {p.isLocked && <Lock size={12} className="text-sbc-red" />}
                      {MONTHS_FULL[p.month - 1]} {p.year}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      defaultValue={p.deadline ? p.deadline.split('T')[0] : ''}
                      onBlur={(e) => { if (e.target.value !== (p.deadline?.split('T')[0] ?? '')) patchPeriod(p.id, { deadline: e.target.value || undefined }) }}
                      className="text-xs bg-transparent border-b border-sbc-grey dark:border-white/10 focus:outline-none focus:border-sbc-red text-gray-600 dark:text-gray-400"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Toggle
                      checked={p.isLocked}
                      onChange={(v) => patchPeriod(p.id, { isLocked: v })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Toggle
                      checked={p.autoReminders}
                      onChange={(v) => patchPeriod(p.id, { autoReminders: v })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => patchPeriod(p.id, { isLocked: !p.isLocked })}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors"
                      >
                        {p.isLocked ? <><Unlock size={12} /> Unlock</> : <><Lock size={12} /> Lock</>}
                      </button>
                      <button
                        onClick={() => sendReminder(p.id)}
                        disabled={reminding === p.id}
                        className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {reminding === p.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Remind
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 4: Form Field Builder ────────────────────────────────────────────────

const fieldSchema = z.object({
  fieldLabel: z.string().min(1, 'Required'),
  fieldType: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox', 'number']),
  fieldOptions: z.string().optional().or(z.literal('')),
  isRequired: z.boolean(),
  visibleToRoles: z.array(z.string()),
})

function FieldModal({
  field,
  formName,
  onClose,
  onSuccess,
}: {
  field?: FieldRecord
  formName: string
  onClose: () => void
  onSuccess: (f: FieldRecord) => void
}) {
  const isEdit = !!field
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof fieldSchema>>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      fieldLabel: field?.fieldLabel ?? '',
      fieldType: (field?.fieldType as z.infer<typeof fieldSchema>['fieldType']) ?? 'text',
      fieldOptions: field?.fieldOptions ?? '',
      isRequired: field?.isRequired ?? false,
      visibleToRoles: field ? JSON.parse(field.visibleToRoles) as string[] : ['ADMIN','HEAD_OF_SUPERVISOR','SUPERVISOR_PASTOR','HOD'],
    },
  })

  const watchedType = watch('fieldType')
  const hasOptions = ['select','radio','checkbox'].includes(watchedType)

  async function onSubmit(values: z.infer<typeof fieldSchema>) {
    const url = isEdit ? `/api/settings/fields/${field!.id}` : '/api/settings/fields'
    const method = isEdit ? 'PATCH' : 'POST'
    const body = isEdit
      ? { ...values, fieldOptions: hasOptions ? values.fieldOptions?.trim() || null : null }
      : { ...values, formName, fieldOptions: hasOptions ? values.fieldOptions?.trim() || null : null }
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) { toast('error', json.error ?? 'Failed'); return }
    toast('success', isEdit ? 'Field updated' : 'Field added')
    onSuccess({
      ...(field ?? { formName, fieldOrder: 99, isActive: true }),
      ...values,
      id: isEdit ? field!.id : json.id,
      visibleToRoles: JSON.stringify(values.visibleToRoles),
      fieldOptions: hasOptions ? values.fieldOptions?.trim() || null : null,
    } as FieldRecord)
  }

  const ALL_ROLES = ['ADMIN','HEAD_OF_SUPERVISOR','SUPERVISOR_PASTOR','HOD']

  return (
    <Modal title={isEdit ? 'EDIT FIELD' : 'ADD FIELD'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Field Label <span className="text-sbc-red">*</span></label>
            <input {...register('fieldLabel')} className={inputCls} />
            {errors.fieldLabel && <p className={errCls}>{errors.fieldLabel.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Field Type</label>
            <select {...register('fieldType')} className={inputCls}>
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {hasOptions && (
            <div>
              <label className={labelCls}>Options <span className="text-gray-400 normal-case font-normal">(one per line)</span></label>
              <textarea {...register('fieldOptions')} rows={4} className={`${inputCls} resize-none`} placeholder="Option 1&#10;Option 2&#10;Option 3" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input {...register('isRequired')} type="checkbox" className="accent-sbc-red w-4 h-4" id="isRequired" />
            <label htmlFor="isRequired" className="text-sm text-sbc-black dark:text-white cursor-pointer">Required field</label>
          </div>
          <div>
            <label className={labelCls}>Visible To Roles</label>
            <div className="flex flex-wrap gap-3">
              {ALL_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" value={role} {...register('visibleToRoles')} className="accent-sbc-red" />
                  <span className="text-sm text-sbc-black dark:text-white">{role.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-sbc-grey dark:border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors">
            {isSubmitting && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? 'Save' : 'Add Field'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function FormFieldList({
  formName,
  initialFields,
}: {
  formName: string
  initialFields: FieldRecord[]
}) {
  const [fields, setFields] = useState(initialFields)
  const [editField, setEditField] = useState<FieldRecord | null | 'new'>(null)

  async function moveField(id: string, direction: 'up' | 'down') {
    const sorted = [...fields].sort((a, b) => a.fieldOrder - b.fieldOrder)
    const idx = sorted.findIndex((f) => f.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]
    const newOrderA = b.fieldOrder
    const newOrderB = a.fieldOrder

    await Promise.all([
      fetch(`/api/settings/fields/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldOrder: newOrderA }),
      }),
      fetch(`/api/settings/fields/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldOrder: newOrderB }),
      }),
    ])

    setFields((prev) => prev.map((f) => {
      if (f.id === a.id) return { ...f, fieldOrder: newOrderA }
      if (f.id === b.id) return { ...f, fieldOrder: newOrderB }
      return f
    }))
  }

  async function deleteField(id: string) {
    if (!confirm('Remove this field?')) return
    const res = await fetch(`/api/settings/fields/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFields((prev) => prev.filter((f) => f.id !== id))
      toast('success', 'Field removed')
    } else toast('error', 'Failed to remove field')
  }

  function handleSuccess(f: FieldRecord) {
    setFields((prev) => {
      const idx = prev.findIndex((x) => x.id === f.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = f; return next }
      return [...prev, f]
    })
    setEditField(null)
  }

  const sorted = [...fields].sort((a, b) => a.fieldOrder - b.fieldOrder)

  return (
    <>
      {(editField === 'new' || (editField && typeof editField === 'object')) && (
        <FieldModal
          field={editField === 'new' ? undefined : editField}
          formName={formName}
          onClose={() => setEditField(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="group flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{sorted.length} custom field{sorted.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setEditField('new')}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded transition-all duration-150"
        >
          <Plus size={13} />
          Add Field
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                {['Order','Label','Type','Required','Visible To','Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No custom fields yet.</td></tr>
              ) : sorted.map((f, i) => (
                <tr key={f.id} className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveField(f.id, 'up')} disabled={i === 0} className="text-gray-400 hover:text-sbc-black dark:hover:text-white disabled:opacity-30 transition-colors"><ChevronUp size={13} /></button>
                      <button onClick={() => moveField(f.id, 'down')} disabled={i === sorted.length - 1} className="text-gray-400 hover:text-sbc-black dark:hover:text-white disabled:opacity-30 transition-colors"><ChevronDown size={13} /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-sbc-black dark:text-white">{f.fieldLabel}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 capitalize">{f.fieldType}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${f.isRequired ? 'text-sbc-red font-medium' : 'text-gray-400'}`}>{f.isRequired ? 'Yes' : 'No'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {(JSON.parse(f.visibleToRoles) as string[]).map((r) => r.replace(/_/g, ' ')).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditField(f)} className="text-xs text-gray-500 hover:text-sbc-black dark:hover:text-white transition-colors"><Edit size={12} /></button>
                      <button onClick={() => deleteField(f.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function FieldsTab({ initialFields }: { initialFields: FieldRecord[] }) {
  const [activeForm, setActiveForm] = useState<typeof FORM_NAMES[number]>('HOD_REPORT')

  const formTabs: TabDef[] = FORM_NAMES.map((f) => ({ id: f, label: FORM_LABELS[f] }))
  const filtered = initialFields.filter((f) => f.formName === activeForm)

  return (
    <div className="space-y-4">
      <Tabs tabs={formTabs} active={activeForm} onChange={(id) => setActiveForm(id as typeof FORM_NAMES[number])} />
      <FormFieldList formName={activeForm} initialFields={filtered} />
    </div>
  )
}

// ─── Main SettingsClient ──────────────────────────────────────────────────────

const MAIN_TABS: TabDef[] = [
  { id: 'smtp', label: 'SMTP' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'periods', label: 'Report Periods' },
  { id: 'fields', label: 'Form Builder' },
]

export default function SettingsClient({ smtp, notifications, periods, fields, teams }: Props) {
  const [activeTab, setActiveTab] = useState('smtp')

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
      <Tabs tabs={MAIN_TABS} active={activeTab} onChange={setActiveTab} className="px-5" />
      <div className="p-5">
        {activeTab === 'smtp' && <SmtpTab initial={smtp} />}
        {activeTab === 'notifications' && <NotificationsTab initialData={notifications} teams={teams} />}
        {activeTab === 'periods' && <PeriodsTab initialData={periods} />}
        {activeTab === 'fields' && <FieldsTab initialFields={fields} />}
      </div>
    </div>
  )
}
