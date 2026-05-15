'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Loader2, Lock } from 'lucide-react'
import { GRADE_COLUMN_LABELS, GRADE_LABELS, computeAverageScore, type GradeValue } from '@/lib/grade-utils'

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

const HOD_GRADE_FIELDS: { key: keyof PastorReviewSummary; label: string }[] = [
  { key: 'hodGeneralAttitude', label: GRADE_COLUMN_LABELS.generalAttitude },
  { key: 'hodTeamwork', label: GRADE_COLUMN_LABELS.teamwork },
  { key: 'hodPunctuality', label: GRADE_COLUMN_LABELS.punctuality },
  { key: 'hodAppearance', label: GRADE_COLUMN_LABELS.appearance },
  { key: 'hodAttendance', label: GRADE_COLUMN_LABELS.attendance },
]

const gradeEnum = z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'NOT_APPLICABLE'])

const reviewSchema = z.object({
  overallComments: z.string().optional(),
  supervisorPerformance: gradeEnum,
  signature: z.string().optional(),
  reviewDate: z.string().optional(),
  confirmed: z.boolean(),
})

type FormValues = z.infer<typeof reviewSchema>

export interface HeadReportSummary {
  id: string
  serviceTeamName: string
  hodName: string
  reportMonth: number
  reportYear: number
  totalMembersEnrolled: number
  totalMembersPresent: number | null
  totalMembersAbsent: number | null
  avgScore: number | null
}

export interface PastorReviewSummary {
  id: string
  pastorName: string
  hodGeneralAttitude: string
  hodTeamwork: string
  hodPunctuality: string
  hodAppearance: string
  hodAttendance: string
  comments: string | null
  submittedAt: string | null
}

export interface ExistingHeadReview {
  overallComments: string | null
  supervisorReviewed: string | null
  supervisorPerformance: string | null
  signature: string | null
  reviewDate: string | null
  confirmed: boolean
  submittedAt: string | null
}

interface Props {
  reportId: string
  headName: string
  report: HeadReportSummary
  pastorReview: PastorReviewSummary | null
  existingReview: ExistingHeadReview | null
}

export default function HeadReviewForm({ reportId, headName, report, pastorReview, existingReview }: Props) {
  const [pageStatus, setPageStatus] = useState<'idle' | 'saving' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const isAlreadySubmitted = !!existingReview?.submittedAt
  const today = new Date().toISOString().split('T')[0]

  const form = useForm<FormValues>({
    resolver: zodResolver(reviewSchema) as Resolver<FormValues>,
    defaultValues: existingReview
      ? {
          overallComments: existingReview.overallComments ?? '',
          supervisorPerformance: (existingReview.supervisorPerformance as GradeValue) ?? 'NOT_APPLICABLE',
          signature: existingReview.signature ?? '',
          reviewDate: existingReview.reviewDate ?? today,
          confirmed: existingReview.confirmed,
        }
      : {
          overallComments: '',
          supervisorPerformance: 'NOT_APPLICABLE',
          signature: '',
          reviewDate: today,
          confirmed: false,
        },
  })

  const { register, setError, formState: { errors } } = form

  const pastorAvg = pastorReview
    ? computeAverageScore({
        generalAttitude: pastorReview.hodGeneralAttitude,
        teamwork: pastorReview.hodTeamwork,
        punctuality: pastorReview.hodPunctuality,
        appearance: pastorReview.hodAppearance,
        attendance: pastorReview.hodAttendance,
      })
    : null

  async function onSave(isDraft: boolean) {
    const values = form.getValues()
    if (!isDraft) {
      let hasError = false
      if (!values.overallComments?.trim()) {
        setError('overallComments', { message: 'Overall comments are required' })
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
      if (hasError) return
    }

    setPageStatus(isDraft ? 'saving' : 'submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/reviews/head', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          pastorReviewId: pastorReview?.id,
          overallComments: values.overallComments?.trim() || undefined,
          supervisorReviewed: pastorReview?.pastorName || undefined,
          supervisorPerformance: values.supervisorPerformance,
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
            SECTION A — REPORT REFERENCE
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Head of Supervisor</label>
            <input readOnly value={headName} className={`${inputCls} opacity-70 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelCls}>Service Team</label>
            <input readOnly value={report.serviceTeamName} className={`${inputCls} opacity-70 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelCls}>Head of Department</label>
            <input readOnly value={report.hodName} className={`${inputCls} opacity-70 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelCls}>Report Period</label>
            <input
              readOnly
              value={`${MONTHS[report.reportMonth - 1]} ${report.reportYear}`}
              className={`${inputCls} opacity-70 cursor-not-allowed`}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Report Summary</label>
            <div className="flex flex-wrap gap-6 mt-1">
              {[
                { label: 'Enrolled', val: report.totalMembersEnrolled },
                { label: 'Present', val: report.totalMembersPresent ?? '—' },
                { label: 'Absent', val: report.totalMembersAbsent ?? '—' },
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

      {/* ── SECTION B — Pastor Review Summary ────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-sbc-black dark:bg-zinc-900 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-white text-xl tracking-widest">
              SECTION B — SUPERVISOR PASTOR REVIEW
            </h2>
            <p className="text-white/50 text-xs mt-0.5">Pastor's evaluation of the HOD — read-only</p>
          </div>
          {pastorAvg !== null && (
            <span className={`text-sm font-bold ${
              pastorAvg >= 4 ? 'text-green-400'
              : pastorAvg >= 3 ? 'text-amber-400'
              : 'text-red-400'
            }`}>
              Avg: {pastorAvg.toFixed(1)}
            </span>
          )}
        </div>

        {pastorReview ? (
          <div className="p-6 space-y-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '580px' }}>
                <thead>
                  <tr className="border-b border-sbc-grey dark:border-white/10">
                    <th className="text-left py-2 pr-4 text-xs uppercase tracking-wider text-gray-500 font-medium w-36">
                      {report.hodName}
                    </th>
                    {HOD_GRADE_FIELDS.map(({ key, label }) => (
                      <th key={key} className="text-center px-2 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 pr-4 text-xs text-gray-400">{pastorReview.pastorName}</td>
                    {HOD_GRADE_FIELDS.map(({ key }) => (
                      <td key={key} className="px-2 py-2 text-center">
                        <span className="text-sm font-medium text-sbc-black dark:text-white">
                          {GRADE_LABELS[pastorReview[key] as GradeValue] ?? '—'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {pastorReview.comments && (
              <div className="pt-4 border-t border-sbc-grey dark:border-white/10">
                <p className={labelCls}>Pastor's Comments</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {pastorReview.comments}
                </p>
              </div>
            )}
            {pastorReview.submittedAt && (
              <p className="text-xs text-gray-400">
                Submitted on{' '}
                {new Date(pastorReview.submittedAt).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-gray-400 text-center py-6">
              No pastor review has been submitted for this report yet.
            </p>
          </div>
        )}
      </section>

      {/* ── SECTION C — Head Assessment ───────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-sbc-grey dark:border-white/10">
          <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">
            SECTION C — HEAD ASSESSMENT
          </h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className={labelCls}>
              Overall Comments <span className="text-sbc-red">*</span>
            </label>
            <textarea
              {...register('overallComments')}
              rows={5}
              disabled={isAlreadySubmitted}
              placeholder="Your overall assessment of this team's report and the HOD's performance..."
              className={`${inputCls} resize-none`}
            />
            {errors.overallComments && (
              <p className="text-sbc-red text-xs mt-1">{errors.overallComments.message}</p>
            )}
          </div>

          {pastorReview && (
            <div>
              <label className={labelCls}>Supervisor Pastor Assessment</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    readOnly
                    value={pastorReview.pastorName}
                    className={`${inputCls} opacity-70 cursor-not-allowed`}
                  />
                </div>
                <div className="flex-1">
                  <select
                    {...register('supervisorPerformance')}
                    disabled={isAlreadySubmitted}
                    className={`${inputCls} appearance-none`}
                  >
                    {GRADE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION D — Confirmation ───────────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-sbc-grey dark:border-white/10">
          <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">
            SECTION D — CONFIRMATION
          </h2>
        </div>
        <div className="p-6 space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-sbc-grey dark:border-white/10">
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
              <label className={labelCls}>Date</label>
              <input
                {...register('reviewDate')}
                type="date"
                disabled={isAlreadySubmitted}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </section>

      {isAlreadySubmitted && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-400 text-sm">
          <Lock size={14} />
          <span>
            Submitted on{' '}
            {new Date(existingReview!.submittedAt!).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
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
