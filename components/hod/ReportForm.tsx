'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, ChevronDown, Loader2 } from 'lucide-react'
import {
  GRADE_FIELDS,
  GRADE_COLUMN_LABELS,
  computeAverageScore,
  type GradeValue,
} from '@/lib/grade-utils'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const now = new Date()
const YEARS = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i)

const GRADE_OPTIONS: { value: GradeValue; label: string }[] = [
  { value: 'FIVE', label: '5' },
  { value: 'FOUR', label: '4' },
  { value: 'THREE', label: '3' },
  { value: 'TWO', label: '2' },
  { value: 'ONE', label: '1' },
  { value: 'NOT_APPLICABLE', label: 'N/A' },
]

export interface TeamData {
  id: string
  name: string
  members: { id: string; fullName: string }[]
}

interface Props {
  teams: TeamData[]
  hodName: string
  defaultAssistantOne?: string | null
  defaultAssistantTwo?: string | null
}

const gradeEnum = z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'NOT_APPLICABLE'])

const formSchema = z.object({
  teamId: z.string().min(1, 'Please select a service team'),
  reportMonth: z.coerce.number().int().min(1).max(12),
  reportYear: z.coerce.number().int().min(2026),
  assistantOne: z.string().optional(),
  assistantTwo: z.string().optional(),
  totalMembersPresent: z.coerce.number().int().min(0, 'Must be 0 or more'),
  generalObservations: z.string().optional(),
  challengesEncountered: z.string().optional(),
  memberGrades: z.array(
    z.object({
      memberId: z.string(),
      generalAttitude: gradeEnum,
      teamwork: gradeEnum,
      punctuality: gradeEnum,
      appearance: gradeEnum,
      attendance: gradeEnum,
    })
  ),
})

type FormValues = z.infer<typeof formSchema>

function makeDefaultGrades(members: TeamData['members']): FormValues['memberGrades'] {
  return members.map((m) => ({
    memberId: m.id,
    generalAttitude: 'NOT_APPLICABLE' as GradeValue,
    teamwork: 'NOT_APPLICABLE' as GradeValue,
    punctuality: 'NOT_APPLICABLE' as GradeValue,
    appearance: 'NOT_APPLICABLE' as GradeValue,
    attendance: 'NOT_APPLICABLE' as GradeValue,
  }))
}

export default function ReportForm({ teams, hodName, defaultAssistantOne, defaultAssistantTwo }: Props) {
  const [pageStatus, setPageStatus] = useState<'idle' | 'saving' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [dupWarning, setDupWarning] = useState('')
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})

  const firstTeam = teams.length === 1 ? teams[0] : null

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      teamId: firstTeam?.id ?? '',
      reportMonth: now.getMonth() + 1,
      reportYear: now.getFullYear(),
      assistantOne: defaultAssistantOne ?? '',
      assistantTwo: defaultAssistantTwo ?? '',
      totalMembersPresent: 0,
      generalObservations: '',
      challengesEncountered: '',
      memberGrades: firstTeam ? makeDefaultGrades(firstTeam.members) : [],
    },
  })

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = form

  const { fields, replace } = useFieldArray({ control, name: 'memberGrades' })

  const teamId = watch('teamId')
  const reportMonth = watch('reportMonth')
  const reportYear = watch('reportYear')
  const totalPresent = watch('totalMembersPresent')
  const memberGradesValues = watch('memberGrades')

  // Sync member names map on first render for single-team HODs
  useEffect(() => {
    if (firstTeam) {
      const map: Record<string, string> = {}
      firstTeam.members.forEach((m) => { map[m.id] = m.fullName })
      setMemberNames(map)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When team changes: replace grade rows, update names map, reset present count
  useEffect(() => {
    if (!teamId) return
    const team = teams.find((t) => t.id === teamId)
    if (!team) return
    replace(makeDefaultGrades(team.members))
    const map: Record<string, string> = {}
    team.members.forEach((m) => { map[m.id] = m.fullName })
    setMemberNames(map)
    setValue('totalMembersPresent', 0)
  }, [teamId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Duplicate check on team + month + year change
  useEffect(() => {
    if (!teamId || !reportMonth || !reportYear) {
      setDupWarning('')
      return
    }
    const ctrl = new AbortController()
    fetch(`/api/reports?teamId=${teamId}&month=${reportMonth}&year=${reportYear}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((data: Array<{ status: string }>) => {
        if (!Array.isArray(data) || data.length === 0) { setDupWarning(''); return }
        const st = data[0].status
        if (['SUBMITTED', 'PASTOR_REVIEWED', 'HEAD_REVIEWED', 'COMPLETED'].includes(st)) {
          setDupWarning('A submitted report already exists for this team and period. You cannot re-submit.')
        } else if (st === 'DRAFT') {
          setDupWarning('A draft exists for this period — saving will update it.')
        } else {
          setDupWarning('')
        }
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [teamId, reportMonth, reportYear])

  async function onSave(isDraft: boolean) {
    const ok = await form.trigger(['teamId', 'reportMonth', 'reportYear'])
    if (!ok) return
    if (!isDraft) {
      const full = await form.trigger()
      if (!full) return
    }

    const values = form.getValues()
    setPageStatus(isDraft ? 'saving' : 'submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: values.teamId,
          reportMonth: Number(values.reportMonth),
          reportYear: Number(values.reportYear),
          assistantOne: values.assistantOne?.trim() || undefined,
          assistantTwo: values.assistantTwo?.trim() || undefined,
          totalMembersPresent: Number(values.totalMembersPresent),
          generalObservations: values.generalObservations?.trim() || undefined,
          challengesEncountered: values.challengesEncountered?.trim() || undefined,
          status: isDraft ? 'DRAFT' : 'SUBMITTED',
          memberGrades: values.memberGrades,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(
          json.error === 'ALREADY_SUBMITTED'
            ? 'This report has already been submitted and cannot be modified.'
            : json.error ?? 'Something went wrong. Please try again.'
        )
        setPageStatus('error')
        return
      }
      if (!isDraft) {
        setPageStatus('success')
      } else {
        setPageStatus('idle')
        setDupWarning('Draft saved — you can continue editing.')
      }
    } catch {
      setErrorMsg('Network error. Check your connection and try again.')
      setPageStatus('error')
    }
  }

  if (pageStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-24">
        <CheckCircle size={60} className="text-green-500" />
        <h2 className="font-heading text-3xl text-sbc-black dark:text-white tracking-widest">
          REPORT SUBMITTED
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Your report for {MONTH_NAMES[Number(reportMonth) - 1]} {reportYear} has been submitted.
        </p>
        <button
          onClick={() => { reset(); setPageStatus('idle'); setDupWarning('') }}
          className="mt-2 px-6 py-2.5 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
        >
          Submit Another Report
        </button>
      </div>
    )
  }

  const isBusy = pageStatus === 'saving' || pageStatus === 'submitting'
  const isLocked = dupWarning.startsWith('A submitted report')

  const inputCls =
    'w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red placeholder:text-gray-300 dark:placeholder:text-gray-600'

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>

      {/* ── SECTION A ─────────────────────────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-sbc-red">
          <h2 className="font-heading text-white text-xl tracking-widest">
            SECTION A — REPORT HEADER
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* HOD Name */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
              Head of Department
            </label>
            <input
              readOnly
              value={hodName}
              className="w-full max-w-sm px-3 py-2 bg-sbc-grey/60 dark:bg-white/5 rounded text-sm text-sbc-black dark:text-white border border-transparent cursor-not-allowed"
            />
          </div>

          {/* Service Team selection */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-medium">
              Service Team <span className="text-sbc-red">*</span>
            </label>
            {errors.teamId && (
              <p className="text-sbc-red text-xs mb-2">{errors.teamId.message}</p>
            )}
            {teams.length === 0 ? (
              <p className="text-sm text-gray-400">No service teams assigned. Contact an administrator.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {teams.map((team) => (
                  <label key={team.id} className="cursor-pointer">
                    <input type="radio" {...register('teamId')} value={team.id} className="sr-only" />
                    <span
                      className={`
                        inline-block px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all select-none
                        ${teamId === team.id
                          ? 'border-sbc-red bg-sbc-red/5 dark:bg-sbc-red/10 text-sbc-red'
                          : 'border-sbc-grey dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-sbc-red/40'}
                      `}
                    >
                      {team.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Month & Year */}
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                Month <span className="text-sbc-red">*</span>
              </label>
              <div className="relative">
                <select
                  {...register('reportMonth')}
                  className="w-full appearance-none px-3 py-2 pr-8 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                Year <span className="text-sbc-red">*</span>
              </label>
              <div className="relative">
                <select
                  {...register('reportYear')}
                  className="w-full appearance-none px-3 py-2 pr-8 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Duplicate warning */}
          {dupWarning && (
            <div
              className={`text-sm px-4 py-2.5 rounded border ${
                isLocked
                  ? 'bg-red-50 dark:bg-red-900/20 text-sbc-red border-sbc-red/20'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              }`}
            >
              {dupWarning}
            </div>
          )}

          {/* Assistants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                Assistant I
              </label>
              <input {...register('assistantOne')} type="text" placeholder="Full name" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                Assistant II
              </label>
              <input {...register('assistantTwo')} type="text" placeholder="Full name" className={inputCls} />
            </div>
          </div>

          {/* Members present */}
          <div className="max-w-[180px]">
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
              Members Present <span className="text-sbc-red">*</span>
            </label>
            <input
              {...register('totalMembersPresent')}
              type="number"
              min={0}
              max={fields.length}
              className={inputCls}
            />
            {errors.totalMembersPresent && (
              <p className="text-sbc-red text-xs mt-1">{errors.totalMembersPresent.message}</p>
            )}
            {fields.length > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">
                Enrolled: <span className="font-medium text-sbc-black dark:text-white">{fields.length}</span>
                &nbsp;·&nbsp;
                Absent: <span className="font-medium text-sbc-black dark:text-white">
                  {Math.max(0, fields.length - Number(totalPresent || 0))}
                </span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── SECTION B — Member Grading ────────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-sbc-black dark:bg-zinc-900">
          <h2 className="font-heading text-white text-xl tracking-widest">
            SECTION B — MEMBER GRADING
          </h2>
          <p className="text-white/50 text-xs mt-0.5">5 = Outstanding · 1 = Poor · N/A = Not Applicable</p>
        </div>

        {fields.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            {teamId ? 'No active members in this team.' : 'Select a service team above to begin grading.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '740px' }}>
              <thead>
                <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium w-44">
                    Member
                  </th>
                  {GRADE_FIELDS.map((f) => (
                    <th
                      key={f}
                      className="text-center px-1 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium"
                      style={{ minWidth: '90px' }}
                    >
                      {GRADE_COLUMN_LABELS[f]}
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium w-14">
                    Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const row = memberGradesValues?.[index]
                  const avg = row
                    ? computeAverageScore({
                        generalAttitude: row.generalAttitude,
                        teamwork: row.teamwork,
                        punctuality: row.punctuality,
                        appearance: row.appearance,
                        attendance: row.attendance,
                      })
                    : null
                  return (
                    <tr
                      key={field.id}
                      className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-2 text-xs font-medium text-sbc-black dark:text-white">
                        {memberNames[field.memberId] ?? '—'}
                        <input type="hidden" {...register(`memberGrades.${index}.memberId`)} />
                      </td>
                      {GRADE_FIELDS.map((gradeField) => (
                        <td key={gradeField} className="px-1 py-1.5 text-center">
                          <select
                            {...register(`memberGrades.${index}.${gradeField}`)}
                            className="w-full text-xs px-1 py-1.5 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded focus:outline-none focus:border-sbc-red text-sbc-black dark:text-white text-center appearance-none cursor-pointer"
                          >
                            {GRADE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`text-xs font-bold ${
                            avg === null
                              ? 'text-gray-400'
                              : avg >= 4
                              ? 'text-green-600 dark:text-green-400'
                              : avg >= 3
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-sbc-red'
                          }`}
                        >
                          {avg !== null ? avg.toFixed(1) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── SECTION C — Remarks ──────────────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-sbc-grey dark:border-white/10">
          <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">
            SECTION C — HOD REMARKS
          </h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
              General Observations
            </label>
            <textarea
              {...register('generalObservations')}
              rows={4}
              placeholder="Overall observations for this period..."
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
              Challenges Encountered
            </label>
            <textarea
              {...register('challengesEncountered')}
              rows={4}
              placeholder="Any challenges faced this period..."
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      {pageStatus === 'error' && errorMsg && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-sbc-red/20 rounded text-sbc-red text-sm">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="button"
          disabled={isBusy || isLocked}
          onClick={() => onSave(true)}
          className="flex items-center gap-2 px-6 py-2.5 border border-sbc-grey dark:border-white/10 text-sm font-medium text-sbc-black dark:text-white rounded hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pageStatus === 'saving' && <Loader2 size={13} className="animate-spin" />}
          Save Draft
        </button>
        <button
          type="button"
          disabled={isBusy || isLocked}
          onClick={() => onSave(false)}
          className="flex items-center gap-2 px-6 py-2.5 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pageStatus === 'submitting' && <Loader2 size={13} className="animate-spin" />}
          Submit Report
        </button>
      </div>
    </form>
  )
}
