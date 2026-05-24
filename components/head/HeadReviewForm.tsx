'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Loader2, Lock } from 'lucide-react'
import { type GradeValue } from '@/lib/grade-utils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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
  const router = useRouter()
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

  async function onSave(isDraft: boolean) {
    const values = form.getValues()
    if (!isDraft) {
      let hasError = false
      if (!values.overallComments?.trim()) {
        setError('overallComments', { message: 'Review is required' })
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
          signature: values.signature?.trim() || headName,
          reviewDate: values.reviewDate || undefined,
          confirmed: true,
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
      if (!isDraft) router.refresh()
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
            <label className={labelCls}>Committee</label>
            <input readOnly value={headName} className={`${inputCls} opacity-70 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelCls}>Service Team</label>
            <input readOnly value={report.serviceTeamName} className={`${inputCls} opacity-70 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelCls}>HOSTs</label>
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

      {/* ── SECTION C — Review ────────────────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-sbc-grey dark:border-white/10">
          <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">
            SECTION C — REVIEW
          </h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className={labelCls}>
              Review <span className="text-sbc-red">*</span>
            </label>
            <textarea
              {...register('overallComments')}
              rows={5}
              disabled={isAlreadySubmitted}
              placeholder="Your review of this team's report and the HOSTs performance..."
              className={`${inputCls} resize-none`}
            />
            {errors.overallComments && (
              <p className="text-sbc-red text-xs mt-1">{errors.overallComments.message}</p>
            )}
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
