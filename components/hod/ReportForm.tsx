'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, CheckCircle, ChevronDown, Loader2, Plus, Trash2, UserPlus, X } from 'lucide-react'
import {
  GRADE_FIELDS,
  GRADE_COLUMN_LABELS,
  computeAverageScore,
  type GradeValue,
} from '@/lib/grade-utils'

const ACHIEVED_OPTIONS = ['Not yet', 'Yes', 'Partial'] as const
const BUDGET_FINANCING_OPTIONS = ['Internally (Service Team)', 'Summit Bible Church'] as const

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
  initialTeamId?: string
  initialReportMonth?: number
  initialReportYear?: number
}

const gradeEnum = z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'NOT_APPLICABLE'])

const formSchema = z.object({
  teamId: z.string().min(1, 'Please select a service team'),
  reportMonth: z.coerce.number().int().min(1).max(12),
  reportYear: z.coerce.number().int().min(2026),
  assistantOne: z.string().optional(),
  assistantTwo: z.string().optional(),
  goalsForMonth: z.array(z.object({
    goalNumber: z.number(),
    goal: z.string().min(1, 'Goal is required'),
    achieved: z.enum(ACHIEVED_OPTIONS, { error: 'Select achievement status' }),
    remarks: z.string().optional(),
  })).min(1).max(5),
  challengesForMonth: z.string().optional(),
  goalsNextMonth: z.string().min(1, 'Goals for next month are required'),
  serviceTeamNeeds: z.string().min(1, 'Service team needs are required'),
  budget: z.string().optional(),
  budgetFinancing: z.enum(BUDGET_FINANCING_OPTIONS).optional().or(z.literal('')),
  serviceTeamLeaderComments: z.string().optional(),
  confirmation: z.boolean().optional(),
  signature: z.string().optional(),
  confirmationDate: z.string().optional(),
  naExplanation: z.string().optional(),
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
}).superRefine((values, ctx) => {
  const hasNa = values.memberGrades.some((grade) =>
    [
      grade.generalAttitude,
      grade.teamwork,
      grade.punctuality,
      grade.appearance,
      grade.attendance,
    ].includes('NOT_APPLICABLE')
  )

  if (hasNa && !values.naExplanation?.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['naExplanation'],
      message: 'Explain any N/A grading selection',
    })
  }
})

type FormValues = z.infer<typeof formSchema>

interface ExistingReportResponse {
  id: string
  status: string
  assistantOne: string | null
  assistantTwo: string | null
  generalObservations: string | null
  challengesEncountered: string | null
  goalsForMonth?: unknown
  challengesForMonth: string | null
  goalsNextMonth: string | null
  serviceTeamNeeds: string | null
  budget: string | null
  budgetFinancing: string | null
  serviceTeamLeaderComments: string | null
  confirmation: boolean
  signature: string | null
  confirmationDate: string | null
  currentStep: number
  naExplanation: string | null
  memberGrades?: Array<{
    memberId: string
    generalAttitude: GradeValue
    teamwork: GradeValue
    punctuality: GradeValue
    appearance: GradeValue
    attendance: GradeValue
  }>
}

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

function todayInputValue() {
  return new Date().toISOString().split('T')[0]
}

function makeDefaultGoal(goalNumber = 1): FormValues['goalsForMonth'][number] {
  return {
    goalNumber,
    goal: '',
    achieved: 'Not yet',
    remarks: '',
  }
}

function normalizeGoals(raw: unknown): FormValues['goalsForMonth'] {
  if (!Array.isArray(raw) || raw.length === 0) return [makeDefaultGoal()]

  return raw.slice(0, 5).map((goal, index) => {
    const item = goal as Partial<FormValues['goalsForMonth'][number]>
    const achieved = ACHIEVED_OPTIONS.includes(item.achieved as (typeof ACHIEVED_OPTIONS)[number])
      ? item.achieved as FormValues['goalsForMonth'][number]['achieved']
      : 'Not yet'

    return {
      goalNumber: index + 1,
      goal: item.goal ?? '',
      achieved,
      remarks: item.remarks ?? '',
    }
  })
}

interface AddMemberModalProps {
  teamName: string
  onClose: () => void
  onSubmit: (values: { firstName: string; lastName: string; phone: string }) => Promise<void>
  submitting: boolean
  error: string
}

function AddMemberModal({ teamName, onClose, onSubmit, submitting, error }: AddMemberModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [localError, setLocalError] = useState('')

  async function handleSubmit() {
    setLocalError('')
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setLocalError('First name, last name, and phone are required.')
      return
    }
    await onSubmit({ firstName, lastName, phone })
  }

  const inputCls =
    'w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-800">
        <div className="flex items-center justify-between border-b border-sbc-grey px-5 py-4 dark:border-white/10">
          <div>
            <h3 className="font-heading text-lg tracking-widest text-sbc-black dark:text-white">ADD MEMBER</h3>
            <p className="text-xs text-gray-400">{teamName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 transition-colors hover:text-sbc-black dark:hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                First Name <span className="text-sbc-red">*</span>
              </label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Last Name <span className="text-sbc-red">*</span>
              </label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Phone <span className="text-sbc-red">*</span>
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className={inputCls} />
          </div>
          {(localError || error) && (
            <div className="flex items-start gap-2 rounded border border-sbc-red/20 bg-red-50 px-3 py-2 text-xs text-sbc-red dark:bg-red-900/20">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{localError || error}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-sbc-grey px-5 py-4 dark:border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-sbc-black dark:hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded bg-sbc-red px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            Save Member
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReportForm({
  teams,
  hodName,
  defaultAssistantOne,
  defaultAssistantTwo,
  initialTeamId,
  initialReportMonth,
  initialReportYear,
}: Props) {
  const [pageStatus, setPageStatus] = useState<'idle' | 'saving' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [dupWarning, setDupWarning] = useState('')
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [teamList, setTeamList] = useState(teams)
  const [step, setStep] = useState<1 | 2>(1)
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberFeedback, setMemberFeedback] = useState('')
  const [addMemberSubmitting, setAddMemberSubmitting] = useState(false)
  const [addMemberError, setAddMemberError] = useState('')
  const restoringDraftRef = useRef(false)

  const initialTeam = teams.find((team) => team.id === initialTeamId) ?? (teams.length === 1 ? teams[0] : null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      teamId: initialTeam?.id ?? '',
      reportMonth: initialReportMonth ?? now.getMonth() + 1,
      reportYear: initialReportYear ?? now.getFullYear(),
      assistantOne: defaultAssistantOne ?? '',
      assistantTwo: defaultAssistantTwo ?? '',
      goalsForMonth: [makeDefaultGoal()],
      challengesForMonth: '',
      goalsNextMonth: '',
      serviceTeamNeeds: '',
      budget: '',
      budgetFinancing: '',
      serviceTeamLeaderComments: '',
      confirmation: false,
      signature: hodName,
      confirmationDate: todayInputValue(),
      naExplanation: '',
      memberGrades: initialTeam ? makeDefaultGrades(initialTeam.members) : [],
    },
  })

  const {
    register,
    control,
    watch,
    reset,
    setError,
    formState: { errors },
  } = form

  const { fields, replace } = useFieldArray({ control, name: 'memberGrades' })
  const {
    fields: goalFields,
    append: appendGoal,
    remove: removeGoal,
    replace: replaceGoals,
  } = useFieldArray({ control, name: 'goalsForMonth' })

  const teamId = watch('teamId')
  const reportMonth = watch('reportMonth')
  const reportYear = watch('reportYear')
  const memberGradesValues = watch('memberGrades')
  const hasNaGrade = memberGradesValues?.some((grade) =>
    [
      grade.generalAttitude,
      grade.teamwork,
      grade.punctuality,
      grade.appearance,
      grade.attendance,
    ].includes('NOT_APPLICABLE')
  ) ?? false

  function getTeam(teamIdToFind: string) {
    return teamList.find((t) => t.id === teamIdToFind)
  }

  function setMemberNamesForTeam(team: TeamData) {
    const map: Record<string, string> = {}
    team.members.forEach((m) => { map[m.id] = m.fullName })
    setMemberNames(map)
  }

  function makeGradesFromDraft(
    members: TeamData['members'],
    draftGrades: ExistingReportResponse['memberGrades'] = []
  ): FormValues['memberGrades'] {
    const savedByMember = new Map(draftGrades.map((grade) => [grade.memberId, grade]))

    return members.map((member) => {
      const saved = savedByMember.get(member.id)

      return {
        memberId: member.id,
        generalAttitude: saved?.generalAttitude ?? 'NOT_APPLICABLE',
        teamwork: saved?.teamwork ?? 'NOT_APPLICABLE',
        punctuality: saved?.punctuality ?? 'NOT_APPLICABLE',
        appearance: saved?.appearance ?? 'NOT_APPLICABLE',
        attendance: saved?.attendance ?? 'NOT_APPLICABLE',
      }
    })
  }

  // Sync member names map on first render for single-team HODs
  useEffect(() => {
    if (initialTeam) {
      setMemberNamesForTeam(initialTeam)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When team changes: replace grade rows, update names map, reset present count
  useEffect(() => {
    if (!teamId) return
    const team = getTeam(teamId)
    if (!team) return
    setMemberNamesForTeam(team)
    if (restoringDraftRef.current) {
      restoringDraftRef.current = false
      return
    }
    replace(makeDefaultGrades(team.members))
  }, [teamId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Existing report lookup on team + month + year change
  useEffect(() => {
    if (!teamId || !reportMonth || !reportYear) {
      setDupWarning('')
      return
    }
    const team = getTeam(teamId)
    if (!team) return

    const ctrl = new AbortController()
    fetch(`/api/reports?teamId=${teamId}&month=${reportMonth}&year=${reportYear}&full=true`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((data: ExistingReportResponse[]) => {
        if (!Array.isArray(data) || data.length === 0) { setDupWarning(''); return }
        const existing = data[0]
        const st = existing.status
        if (['SUBMITTED', 'PASTOR_REVIEWED', 'HEAD_REVIEWED', 'COMPLETED'].includes(st)) {
          setDupWarning('A submitted report already exists for this team and period. You cannot re-submit.')
        } else if (st === 'DRAFT') {
          restoringDraftRef.current = true
          setMemberNamesForTeam(team)
          reset({
            teamId,
            reportMonth: Number(reportMonth),
            reportYear: Number(reportYear),
            assistantOne: existing.assistantOne ?? '',
            assistantTwo: existing.assistantTwo ?? '',
            goalsForMonth: normalizeGoals(existing.goalsForMonth),
            challengesForMonth: existing.challengesForMonth ?? existing.challengesEncountered ?? '',
            goalsNextMonth: existing.goalsNextMonth ?? '',
            serviceTeamNeeds: existing.serviceTeamNeeds ?? '',
            budget: existing.budget ?? '',
            budgetFinancing: (existing.budgetFinancing as FormValues['budgetFinancing']) ?? '',
            serviceTeamLeaderComments: existing.serviceTeamLeaderComments ?? existing.generalObservations ?? '',
            confirmation: existing.confirmation ?? false,
            signature: existing.signature ?? hodName,
            confirmationDate: existing.confirmationDate?.split('T')[0] ?? todayInputValue(),
            naExplanation: existing.naExplanation ?? '',
            memberGrades: makeGradesFromDraft(team.members, existing.memberGrades),
          })
          replaceGoals(normalizeGoals(existing.goalsForMonth))
          setStep(existing.currentStep === 2 ? 2 : 1)
          setDupWarning('A draft exists for this period — saving will update it.')
        } else {
          setDupWarning('')
        }
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [teamId, reportMonth, reportYear]) // eslint-disable-line react-hooks/exhaustive-deps

  async function goNext() {
    const ok = await form.trigger([
      'teamId',
      'reportMonth',
      'reportYear',
      'goalsForMonth',
      'goalsNextMonth',
      'serviceTeamNeeds',
    ])
    if (ok) setStep(2)
  }

  async function refreshTeamMembers(teamIdToRefresh: string) {
    const res = await fetch(`/api/members?teamId=${teamIdToRefresh}`)
    if (!res.ok) throw new Error('Could not refresh members')
    const members = await res.json() as Array<{ id: string; fullName: string }>
    const normalizedMembers = members.map((member) => ({ id: member.id, fullName: member.fullName }))

    setTeamList((current) =>
      current.map((team) =>
        team.id === teamIdToRefresh ? { ...team, members: normalizedMembers } : team
      )
    )

    const existingGrades = form.getValues('memberGrades')
    const savedByMember = new Map(existingGrades.map((grade) => [grade.memberId, grade]))
    replace(normalizedMembers.map((member) => savedByMember.get(member.id) ?? {
      memberId: member.id,
      generalAttitude: 'NOT_APPLICABLE' as GradeValue,
      teamwork: 'NOT_APPLICABLE' as GradeValue,
      punctuality: 'NOT_APPLICABLE' as GradeValue,
      appearance: 'NOT_APPLICABLE' as GradeValue,
      attendance: 'NOT_APPLICABLE' as GradeValue,
    }))
    setMemberNamesForTeam({ id: teamIdToRefresh, name: '', members: normalizedMembers })
  }

  async function handleAddMember(values: { firstName: string; lastName: string; phone: string }) {
    if (!teamId) return
    setAddMemberSubmitting(true)
    setAddMemberError('')
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phone: values.phone.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAddMemberError(json.error ?? 'Unable to add member.')
        setAddMemberSubmitting(false)
        return
      }
      await refreshTeamMembers(teamId)
      setShowAddMember(false)
      setMemberFeedback('Member added to the assessment list.')
    } catch {
      setAddMemberError('Network error. Try again.')
    }
    setAddMemberSubmitting(false)
  }

  async function onSave(isDraft: boolean) {
    const ok = await form.trigger(['teamId', 'reportMonth', 'reportYear'])
    if (!ok) return
    if (!isDraft) {
      const full = await form.trigger()
      if (!full) return
      const finalValues = form.getValues()
      let hasFinalError = false
      if (!finalValues.serviceTeamLeaderComments?.trim()) {
        setError('serviceTeamLeaderComments', { message: 'Comments are required' })
        hasFinalError = true
      }
      if (!finalValues.confirmation) {
        setError('confirmation', { message: 'Confirmation is required' })
        hasFinalError = true
      }
      if (!finalValues.signature?.trim()) {
        setError('signature', { message: 'Signature is required' })
        hasFinalError = true
      }
      if (!finalValues.confirmationDate) {
        setError('confirmationDate', { message: 'Date is required' })
        hasFinalError = true
      }
      if (hasFinalError) {
        setStep(2)
        return
      }
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
          goalsForMonth: values.goalsForMonth.map((goal, index) => ({
            goalNumber: index + 1,
            goal: goal.goal,
            achieved: goal.achieved,
            remarks: goal.remarks,
          })),
          challengesForMonth: values.challengesForMonth?.trim() || undefined,
          goalsNextMonth: values.goalsNextMonth?.trim() || undefined,
          serviceTeamNeeds: values.serviceTeamNeeds?.trim() || undefined,
          budget: values.budget?.trim() || undefined,
          budgetFinancing: values.budgetFinancing || undefined,
          serviceTeamLeaderComments: values.serviceTeamLeaderComments?.trim() || undefined,
          confirmation: values.confirmation,
          signature: values.signature?.trim() || undefined,
          confirmationDate: values.confirmationDate,
          currentStep: step,
          naExplanation: values.naExplanation?.trim() || undefined,
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
      {showAddMember && teamId && (
        <AddMemberModal
          teamName={getTeam(teamId)?.name ?? 'Selected team'}
          onClose={() => { setShowAddMember(false); setAddMemberError('') }}
          onSubmit={handleAddMember}
          submitting={addMemberSubmitting}
          error={addMemberError}
        />
      )}

      {/* ── SECTION A ─────────────────────────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-sbc-red">
          <h2 className="font-heading text-white text-xl tracking-widest">
            SECTION A — REPORT HEADER
          </h2>
        </div>

        <div className="grid w-full max-w-[1024px] grid-cols-1 gap-y-6 p-6 md:grid-cols-2 md:gap-x-7 md:gap-y-[22px]">
          {/* HOSTs Name */}
          <div className="md:col-span-1">
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
              HOSTs
            </label>
            <input
              readOnly
              value={hodName}
              className="w-full px-3 py-2 bg-sbc-grey/60 dark:bg-white/5 rounded text-sm text-sbc-black dark:text-white border border-transparent cursor-not-allowed"
            />
          </div>

          {/* Service Team selection */}
          <div className="md:col-span-2">
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
          <div className="grid grid-cols-1 gap-y-6 md:col-span-2 md:grid-cols-2 md:gap-x-7 md:gap-y-[22px]">
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
              className={`md:col-span-2 text-sm px-4 py-2.5 rounded border ${
                isLocked
                  ? 'bg-red-50 dark:bg-red-900/20 text-sbc-red border-sbc-red/20'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              }`}
            >
              {dupWarning}
            </div>
          )}

          {/* Assistants */}
          <div className="grid grid-cols-1 gap-y-6 md:col-span-2 md:grid-cols-2 md:gap-x-7 md:gap-y-[22px]">
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

          {/* Members enrolled */}
          {fields.length > 0 && (
            <div className="max-w-[180px] md:col-span-1">
              <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                Members Enrolled
              </label>
              <input
                readOnly
                value={fields.length}
                className="w-full px-3 py-2 bg-sbc-grey/60 dark:bg-white/5 rounded text-sm text-sbc-black dark:text-white border border-transparent cursor-not-allowed"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION B — Member Grading ────────────────────────── */}
      {step === 1 && (
        <>
          <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-sbc-black dark:bg-zinc-900">
              <h2 className="font-heading text-white text-xl tracking-widest">
                SECTION B: GOALS FOR THE MONTH
              </h2>
            </div>
            <div className="w-full max-w-[1024px] space-y-6 p-6">
              {goalFields.map((field, index) => (
                <div key={field.id} className="rounded-lg border border-sbc-grey p-4 dark:border-white/10">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-sbc-black dark:text-white">
                      Goal {index + 1}
                    </p>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeGoal(index)}
                        className="inline-flex items-center gap-1 rounded border border-sbc-grey px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:border-sbc-red hover:text-sbc-red dark:border-white/10"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-y-5 md:grid-cols-2 md:gap-x-7">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                        Goal {index + 1} <span className="text-sbc-red">*</span>
                      </label>
                      <input type="hidden" {...register(`goalsForMonth.${index}.goalNumber`, { valueAsNumber: true })} value={index + 1} />
                      <input
                        {...register(`goalsForMonth.${index}.goal`)}
                        type="text"
                        className={inputCls}
                        placeholder="Enter goal"
                      />
                      {errors.goalsForMonth?.[index]?.goal && (
                        <p className="mt-1 text-xs text-sbc-red">{errors.goalsForMonth[index]?.goal?.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                        Achieved? <span className="text-sbc-red">*</span>
                      </label>
                      <div className="relative">
                        <select
                          {...register(`goalsForMonth.${index}.achieved`)}
                          className="w-full appearance-none px-3 py-2 pr-8 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red"
                        >
                          {ACHIEVED_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Please select as appropriate</p>
                      {errors.goalsForMonth?.[index]?.achieved && (
                        <p className="mt-1 text-xs text-sbc-red">{errors.goalsForMonth[index]?.achieved?.message}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                        Remarks
                      </label>
                      <textarea
                        {...register(`goalsForMonth.${index}.remarks`)}
                        rows={3}
                        className={`${inputCls} resize-none`}
                        placeholder="Optional remarks"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {goalFields.length < 5 && (
                <button
                  type="button"
                  onClick={() => appendGoal(makeDefaultGoal(goalFields.length + 1))}
                  className="inline-flex items-center gap-2 rounded border border-sbc-red/30 px-4 py-2 text-sm font-medium text-sbc-red transition-colors hover:bg-sbc-red/5"
                >
                  <Plus size={15} />
                  Add More Goals
                </button>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-sbc-black dark:bg-zinc-900">
              <h2 className="font-heading text-white text-xl tracking-widest">
                SECTION C: CHALLENGES FOR THE MONTH (IF ANY)
              </h2>
            </div>
            <div className="w-full max-w-[1024px] p-6">
              <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                Challenges
              </label>
              <textarea
                {...register('challengesForMonth')}
                rows={4}
                className={`${inputCls} resize-none`}
                placeholder="Describe any challenges for this month"
              />
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-sbc-black dark:bg-zinc-900">
              <h2 className="font-heading text-white text-xl tracking-widest">
                SECTION D: WHAT ARE YOUR GOALS FOR NEXT MONTH?
              </h2>
            </div>
            <div className="w-full max-w-[1024px] p-6">
              <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                Goals <span className="text-sbc-red">*</span>
              </label>
              <textarea
                {...register('goalsNextMonth')}
                rows={4}
                className={`${inputCls} resize-none`}
                placeholder="Enter goals for next month"
              />
              {errors.goalsNextMonth && (
                <p className="mt-1 text-xs text-sbc-red">{errors.goalsNextMonth.message}</p>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-sbc-black dark:bg-zinc-900">
              <h2 className="font-heading text-white text-xl tracking-widest">
                SECTION E: WHAT ARE YOUR SERVICE TEAM&apos;S NEEDS FOR NEXT MONTH?
              </h2>
            </div>
            <div className="grid w-full max-w-[1024px] grid-cols-1 gap-y-5 p-6 md:grid-cols-2 md:gap-x-7">
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                  Needs <span className="text-sbc-red">*</span>
                </label>
                <textarea
                  {...register('serviceTeamNeeds')}
                  rows={4}
                  className={`${inputCls} resize-none`}
                  placeholder="Describe service team needs"
                />
                {errors.serviceTeamNeeds && (
                  <p className="mt-1 text-xs text-sbc-red">{errors.serviceTeamNeeds.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                  Budget
                </label>
                <input {...register('budget')} type="text" className={inputCls} placeholder="Optional budget" />
              </div>
              <div>
                <p className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  Budget Financing
                </p>
                <div className="space-y-2">
                  {BUDGET_FINANCING_OPTIONS.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-sbc-black dark:text-white">
                      <input
                        type="radio"
                        {...register('budgetFinancing')}
                        value={option}
                        className="h-4 w-4 border-sbc-grey text-sbc-red focus:ring-sbc-red"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3 pb-8">
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
              onClick={goNext}
              className="flex items-center gap-2 px-8 py-2.5 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}

      <section className={`${step === 2 ? 'bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden' : 'hidden'}`}>
        <div className="px-6 py-4 bg-sbc-black dark:bg-zinc-900">
          <h2 className="font-heading text-white text-xl tracking-widest">
            SECTION F: SERVICE TEAM MEMBERS PERFORMANCE ASSESSMENT
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
        <div className="flex flex-wrap items-center gap-3 border-t border-sbc-grey px-6 py-4 dark:border-white/10">
          <button
            type="button"
            disabled={!teamId || isLocked}
            onClick={() => { setShowAddMember(true); setMemberFeedback('') }}
            className="inline-flex items-center gap-2 rounded bg-sbc-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus size={15} />
            Add Member
          </button>
          {memberFeedback && (
            <p className="text-sm text-green-600 dark:text-green-400">{memberFeedback}</p>
          )}
        </div>
        {hasNaGrade && (
          <div className="border-t border-sbc-grey p-6 dark:border-white/10">
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
              N/A Explanation <span className="text-sbc-red">*</span>
            </label>
            <textarea
              {...register('naExplanation')}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Explain why N/A was selected"
            />
            {errors.naExplanation && (
              <p className="mt-1 text-xs text-sbc-red">{errors.naExplanation.message}</p>
            )}
          </div>
        )}
      </section>

      {/* ── SECTION C — Remarks ──────────────────────────────── */}
      <section className={`${step === 2 ? 'bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden' : 'hidden'}`}>
        <div className="px-6 py-4 border-b border-sbc-grey dark:border-white/10">
          <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">
            SECTION G: COMMENTS BY SERVICE TEAM LEADER
          </h2>
        </div>
        <div className="grid w-full max-w-[1024px] grid-cols-1 gap-y-5 p-6 md:grid-cols-2 md:gap-x-7">
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
              Comments <span className="text-sbc-red">*</span>
            </label>
            <textarea
              {...register('serviceTeamLeaderComments')}
              rows={4}
              placeholder="Enter comments"
              className={`${inputCls} resize-none`}
            />
            {errors.serviceTeamLeaderComments && (
              <p className="mt-1 text-xs text-sbc-red">{errors.serviceTeamLeaderComments.message}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="flex items-start gap-3 rounded-lg border border-sbc-grey p-3 text-sm text-sbc-black dark:border-white/10 dark:text-white">
              <input
                type="checkbox"
                {...register('confirmation')}
                className="mt-0.5 h-4 w-4 border-sbc-grey text-sbc-red focus:ring-sbc-red"
              />
              <span>I confirm that the information provided is accurate and true to the best of my knowledge.</span>
            </label>
            {errors.confirmation && (
              <p className="mt-1 text-xs text-sbc-red">{errors.confirmation.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
              Signature <span className="text-sbc-red">*</span>
            </label>
            <input {...register('signature')} type="text" className={inputCls} placeholder="Full name" />
            {errors.signature && (
              <p className="mt-1 text-xs text-sbc-red">{errors.signature.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
              Date <span className="text-sbc-red">*</span>
            </label>
            <input {...register('confirmationDate')} type="date" className={inputCls} />
            {errors.confirmationDate && (
              <p className="mt-1 text-xs text-sbc-red">{errors.confirmationDate.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      {step === 2 && pageStatus === 'error' && errorMsg && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-sbc-red/20 rounded text-sbc-red text-sm">
          {errorMsg}
        </div>
      )}

      {step === 2 && (
      <div className="flex flex-wrap items-center justify-end gap-3 pb-8">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => setStep(1)}
          className="px-6 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:text-sbc-black disabled:opacity-50 dark:text-gray-400 dark:hover:text-white"
        >
          Back
        </button>
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
      )}
    </form>
  )
}
