'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Loader2, Lock } from 'lucide-react'
import { GRADE_COLUMN_LABELS, computeAverageScore, type GradeValue } from '@/lib/grade-utils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const GRADE_OPTIONS: { value: GradeValue; label: string }[] = [
  { value: 'FIVE', label: '5 — Outstanding' },
  { value: 'FOUR', label: '4 — Very Good' },
  { value: 'THREE', label: '3 — Good' },
  { value: 'TWO', label: '2 — Fair' },
  { value: 'ONE', label: '1 — Poor' },
  { value: 'NOT_APPLICABLE', label: 'N/A' },
]

const HOD_GRADE_FIELDS = [
  { formKey: 'hodGeneralAttitude' as const, scoreKey: 'generalAttitude' as const, label: GRADE_COLUMN_LABELS.generalAttitude },
  { formKey: 'hodTeamwork' as const, scoreKey: 'teamwork' as const, label: GRADE_COLUMN_LABELS.teamwork },
  { formKey: 'hodPunctuality' as const, scoreKey: 'punctuality' as const, label: GRADE_COLUMN_LABELS.punctuality },
  { formKey: 'hodAppearance' as const, scoreKey: 'appearance' as const, label: GRADE_COLUMN_LABELS.appearance },
  { formKey: 'hodAttendance' as const, scoreKey: 'attendance' as const, label: GRADE_COLUMN_LABELS.attendance },
]

const gradeEnum = z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'NOT_APPLICABLE'])

const reviewSchema = z.object({
  hodGeneralAttitude: gradeEnum,
  hodTeamwork: gradeEnum,
  hodPunctuality: gradeEnum,
  hodAppearance: gradeEnum,
  hodAttendance: gradeEnum,
  comments: z.string().optional(),
  signature: z.string().optional(),
  reviewDate: z.string().optional(),
  confirmed: z.boolean(),
})

type FormValues = z.infer<typeof reviewSchema>

export interface ReportSummary {
  id: string
  serviceTeamName: string
  hodName: string
  reportMonth: number
  reportYear: number
  totalMembersEnrolled: number
  avgScore: number | null
}

export interface ExistingPastorReview {
  hodGeneralAttitude: string
  hodTeamwork: string
  hodPunctuality: string
  hodAppearance: string
  hodAttendance: string
  comments: string | null
  signature: string | null
  reviewDate: string | null
  confirmed: boolean
  submittedAt: string | null
}

interface Props {
  reportId: string
  pastorName: string
  report: ReportSummary
  existingReview: ExistingPastorReview | null
}

export default function ReviewForm({ reportId, pastorName, report, existingReview }: Props) {
  const router = useRouter()
  const [pageStatus, setPageStatus] = useState<'idle' | 'saving' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const isAlreadySubmitted = !!existingReview?.submittedAt
  const today = new Date().toISOString().split('T')[0]

  const form = useForm<FormValues>({
    resolver: zodResolver(reviewSchema) as Resolver<FormValues>,
    defaultValues: existingReview
      ? {
          hodGeneralAttitude: existingReview.hodGeneralAttitude as GradeValue,
          hodTeamwork: existingReview.hodTeamwork as GradeValue,
          hodPunctuality: existingReview.hodPunctuality as GradeValue,
          hodAppearance: existingReview.hodAppearance as GradeValue,
          hodAttendance: existingReview.hodAttendance as GradeValue,
          comments: existingReview.comments ?? '',
          signature: existingReview.signature ?? '',
          reviewDate: existingReview.reviewDate ?? today,
          confirmed: existingReview.confirmed,
        }
      : {
          hodGeneralAttitude: 'NOT_APPLICABLE',
          hodTeamwork: 'NOT_APPLICABLE',
          hodPunctuality: 'NOT_APPLICABLE',
          hodAppearance: 'NOT_APPLICABLE',
          hodAttendance: 'NOT_APPLICABLE',
          comments: '',
          signature: '',
          reviewDate: today,
          confirmed: false,
        },
  })

  const { register, watch, setError, formState: { errors } } = form

  const watchedGrades = watch()
  const liveAvg = computeAverageScore({
    generalAttitude: watchedGrades.hodGeneralAttitude || 'NOT_APPLICABLE',
    teamwork: watchedGrades.hodTeamwork || 'NOT_APPLICABLE',
    punctuality: watchedGrades.hodPunctuality || 'NOT_APPLICABLE',
    appearance: watchedGrades.hodAppearance || 'NOT_APPLICABLE',
    attendance: watchedGrades.hodAttendance || 'NOT_APPLICABLE',
  })

  async function onSave(isDraft: boolean) {
    const values = form.getValues()
    if (!isDraft) {
      let hasError = false
      if (!values.comments?.trim()) {
        setError('comments', { message: 'Review is required' })
        hasError = true
      }
      if (!values.signature?.trim()) {
        setError('signature', { message: 'Signature is required' })
        hasError = true
      }
      if (!values.confirmed) {
        setError('confirmed', { message: 'Please confirm the information is accurate' })
        hasError = true
      }
      if (!values.reviewDate) {
        setError('reviewDate', { message: 'Date is required' })
        hasError = true
      }
      if (hasError) return
    }

    setPageStatus(isDraft ? 'saving' : 'submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/reviews/pastor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          hodGeneralAttitude: values.hodGeneralAttitude,
          hodTeamwork: values.hodTeamwork,
          hodPunctuality: values.hodPunctuality,
          hodAppearance: values.hodAppearance,
          hodAttendance: values.hodAttendance,
          comments: values.comments?.trim() || undefined,
          signature: values.signature?.trim() || undefined,
          reviewDate: values.reviewDate || undefined,
          confirmed: values.confirmed,
          status: isDraft ? 'DRAFT' : 'SUBMITTED',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(
          json.error === 'ALREADY_REVIEWED'
            ? 'This review has already been submitted.'
            : json.error ?? 'Something went wrong.'
        )
        setPageStatus('error')
        return
      }
      setPageStatus(isDraft ? 'idle' : 'success')
      if (!isDraft) {
        router.refresh()
      }
    } catch {
      setErrorMsg('Network error. Check your connection and try again.')
      setPageStatus('error')
    }
  }

  if (pageStatus === 'success') {
    return (
      <div className="flex flex-col items-center gap-5 py-24">
        <CheckCircle size={60} className="text-green-500" />
        <h2 className="font-heading text-3xl text-sbc-black dark:text-white tracking-widest">
          REVIEW SUBMITTED
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Your review for {MONTHS[report.reportMonth - 1]} {report.reportYear} has been submitted.
        </p>
      </div>
    )
  }

  const isBusy = pageStatus === 'saving' || pageStatus === 'submitting'
  const inputCls = `w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded text-sm text-sbc-black dark:text-white focus:outline-none focus:border-sbc-red ${isAlreadySubmitted ? 'opacity-70 cursor-not-allowed' : ''}`
  const labelCls = 'block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium'

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>

      {/* ── SECTION A — Report Reference ──────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-sbc-red">
          <h2 className="font-heading text-white text-xl tracking-widest">
            SECTION A — SUPERVISING PASTOR
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Name of Supervising Pastor</label>
            <input readOnly value={pastorName} className={`${inputCls} opacity-70 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelCls}>HOSTs Name</label>
            <input readOnly value={report.hodName} className={`${inputCls} opacity-70 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelCls}>Service Team</label>
            <input readOnly value={report.serviceTeamName} className={`${inputCls} opacity-70 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelCls}>Month</label>
            <input
              readOnly
              value={`${MONTHS[report.reportMonth - 1]} ${report.reportYear}`}
              className={`${inputCls} opacity-70 cursor-not-allowed`}
            />
          </div>

          {/* Stats summary */}
          <div className="sm:col-span-2">
            <label className={labelCls}>Report Summary</label>
            <div className="flex flex-wrap gap-6 mt-1">
              {[
                { label: 'Enrolled', val: report.totalMembersEnrolled },
              ].map(({ label, val }) => (
                <div key={label} className="text-center min-w-[48px]">
                  <p className="text-2xl font-heading text-sbc-black dark:text-white">{val}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
              <div className="text-center min-w-[48px]">
                <p className={`text-2xl font-heading ${
                  report.avgScore === null ? 'text-gray-400'
                  : report.avgScore >= 4 ? 'text-green-600 dark:text-green-400'
                  : report.avgScore >= 3 ? 'text-amber-600 dark:text-amber-400'
                  : 'text-sbc-red'
                }`}>
                  {report.avgScore !== null ? report.avgScore.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-gray-400">Avg Score</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION B — HOSTs Evaluation ────────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-sbc-black dark:bg-zinc-900">
          <div>
            <h2 className="font-heading text-white text-xl tracking-widest">
              SECTION B — SERVICE TEAM LEADERS&apos; PERFORMANCE ASSESSMENT
            </h2>
            <p className="text-white/50 text-xs mt-0.5">5 = Outstanding · 1 = Poor · N/A = Not Applicable</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '740px' }}>
            <thead>
              <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium w-44">
                  Member
                </th>
                {HOD_GRADE_FIELDS.map(({ formKey, label }) => (
                  <th
                    key={formKey}
                    className="text-center px-1 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium"
                    style={{ minWidth: '90px' }}
                  >
                    {label}
                  </th>
                ))}
                <th className="text-center px-3 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium w-14">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                <td className="px-4 py-2 text-xs font-medium text-sbc-black dark:text-white">{report.hodName}</td>
                {HOD_GRADE_FIELDS.map(({ formKey }) => (
                  <td key={formKey} className="px-1 py-1.5 text-center">
                    <select
                      {...register(formKey)}
                      disabled={isAlreadySubmitted}
                      className="w-full text-xs px-1 py-1.5 bg-white dark:bg-zinc-700 border border-sbc-grey dark:border-white/10 rounded focus:outline-none focus:border-sbc-red text-sbc-black dark:text-white text-center appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {GRADE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label.split(' ')[0]}</option>
                      ))}
                    </select>
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  <span
                    className={`text-xs font-bold ${
                      liveAvg === null
                        ? 'text-gray-400'
                        : liveAvg >= 4
                        ? 'text-green-600 dark:text-green-400'
                        : liveAvg >= 3
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-sbc-red'
                    }`}
                  >
                    {liveAvg !== null ? liveAvg.toFixed(1) : 'N/A'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── SECTION C — Review ────────────────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-sbc-grey dark:border-white/10">
          <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">
            SECTION C — REVIEW BY SUPERVISING PASTOR
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Visible to Pastor, committee &amp; HOSTs</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className={labelCls}>
              Review <span className="text-sbc-red">*</span>
            </label>
            <textarea
              {...register('comments')}
              rows={5}
              disabled={isAlreadySubmitted}
              placeholder="Your Review on this HOSTs Performance"
              className={`${inputCls} resize-none`}
            />
            {errors.comments && (
              <p className="text-sbc-red text-xs mt-1">{errors.comments.message}</p>
            )}
          </div>

          <div className="pt-2 border-t border-sbc-grey dark:border-white/10 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('confirmed')}
                disabled={isAlreadySubmitted}
                className="mt-0.5 w-4 h-4 accent-sbc-red"
              />
              <span className="text-sm text-sbc-black dark:text-white leading-relaxed">
                I confirm that the information provided in this review is accurate to the best of my knowledge.
              </span>
            </label>
            {errors.confirmed && (
              <p className="text-sbc-red text-xs">{errors.confirmed.message}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Signature (Full Name) <span className="text-sbc-red">*</span>
                </label>
                <input
                  {...register('signature')}
                  type="text"
                  disabled={isAlreadySubmitted}
                  placeholder="Your full name"
                  className={inputCls}
                />
                {errors.signature && (
                  <p className="text-sbc-red text-xs mt-1">{errors.signature.message}</p>
                )}
              </div>
              <div>
                <label className={labelCls}>
                  Date <span className="text-sbc-red">*</span>
                </label>
                <input
                  {...register('reviewDate')}
                  type="date"
                  disabled={isAlreadySubmitted}
                  className={inputCls}
                />
                {errors.reviewDate && (
                  <p className="text-sbc-red text-xs mt-1">{errors.reviewDate.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Submitted notice */}
      {isAlreadySubmitted && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-400 text-sm">
          <Lock size={14} />
          <span>
            Submitted on{' '}
            {new Date(existingReview!.submittedAt!).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
            . This review is locked.
          </span>
        </div>
      )}

      {pageStatus === 'error' && errorMsg && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-sbc-red/20 rounded text-sbc-red text-sm">
          {errorMsg}
        </div>
      )}

      {!isAlreadySubmitted && (
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onSave(true)}
            className="flex items-center gap-2 px-6 py-2.5 border border-sbc-grey dark:border-white/10 text-sm font-medium text-sbc-black dark:text-white rounded hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            {pageStatus === 'saving' && <Loader2 size={13} className="animate-spin" />}
            Save Draft
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onSave(false)}
            className="flex items-center gap-2 px-6 py-2.5 bg-sbc-red text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {pageStatus === 'submitting' && <Loader2 size={13} className="animate-spin" />}
            Submit Review
          </button>
        </div>
      )}
    </form>
  )
}
