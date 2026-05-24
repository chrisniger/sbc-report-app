import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import PrintButton from '@/components/report/PrintButton'
import { GRADE_LABELS, GRADE_COLUMN_LABELS, GRADE_FIELDS } from '@/lib/grade-utils'
import type { GradeValue } from '@/lib/grade-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportData {
  id: string
  serviceTeamName: string
  hodName: string
  assistantOne: string | null
  assistantTwo: string | null
  reportMonth: number
  reportYear: number
  status: string
  totalMembersEnrolled: number
  generalObservations: string | null
  challengesEncountered: string | null
  goalsForMonth: ReportGoal[]
  challengesForMonth: string | null
  goalsNextMonth: string | null
  serviceTeamNeeds: string | null
  budget: string | null
  budgetFinancing: string | null
  serviceTeamLeaderComments: string | null
  confirmation: boolean
  signature: string | null
  confirmationDate: string | null
  naExplanation: string | null
  hodSignature: string | null
  submittedAt: string | null
}

export interface ReportGoal {
  goalNumber: number
  goal: string
  achieved: string
  remarks: string | null
}

export interface MemberGradeRow {
  id: string
  memberFullName: string
  generalAttitude: string
  teamwork: string
  punctuality: string
  appearance: string
  attendance: string
  averageScore: number | null
}

export interface PastorReviewRow {
  reviewerName: string
  hodGeneralAttitude: string
  hodTeamwork: string
  hodPunctuality: string
  hodAppearance: string
  hodAttendance: string
  comments: string | null
  reviewDate: string | null
  submittedAt: string | null
}

export interface HeadReviewRow {
  reviewerName: string
  overallComments: string | null
  supervisorReviewed: string | null
  supervisorPerformance: string | null
  reviewDate: string | null
  submittedAt: string | null
}

interface Props {
  backHref: string
  backLabel: string
  report: ReportData
  memberGrades: MemberGradeRow[]
  pastorReview?: PastorReviewRow | null
  headReview?: HeadReviewRow | null
  showPastorReview: boolean
  showPastorReviewGrades?: boolean
  showHeadReview: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function gradeCell(g: string) {
  const label = GRADE_LABELS[g as GradeValue] ?? g
  const color =
    g === 'FIVE'   ? 'text-green-600 dark:text-green-400 font-semibold' :
    g === 'FOUR'   ? 'text-emerald-600 dark:text-emerald-400 font-medium' :
    g === 'THREE'  ? 'text-amber-600 dark:text-amber-400' :
    g === 'TWO'    ? 'text-orange-600 dark:text-orange-400' :
    g === 'ONE'    ? 'text-red-600 dark:text-red-400' :
    'text-gray-400'
  return <span className={`text-xs ${color}`}>{label}</span>
}

function avgColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 4.5) return 'text-green-600 dark:text-green-400'
  if (score >= 3.5) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 2.5) return 'text-amber-600 dark:text-amber-400'
  if (score >= 1.5) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 py-4 border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/40">
      <h2 className="font-heading text-base text-sbc-black dark:text-white tracking-widest">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  )
}

// ─── Grade row pair (label + value) ───────────────────────────────────────────

function ReviewGradeRow({ label, grade }: { label: string; grade: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-sbc-grey/50 dark:border-white/5 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      {gradeCell(grade)}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportDetail({
  backHref,
  backLabel,
  report,
  memberGrades,
  pastorReview,
  headReview,
  showPastorReview,
  showPastorReviewGrades = true,
  showHeadReview,
}: Props) {
  const period = `${MONTHS[report.reportMonth - 1]} ${report.reportYear}`
  const hasNewSections =
    report.goalsForMonth.length > 0 ||
    Boolean(report.challengesForMonth) ||
    Boolean(report.goalsNextMonth) ||
    Boolean(report.serviceTeamNeeds) ||
    Boolean(report.serviceTeamLeaderComments)

  return (
    <div className="space-y-5 print:space-y-4">
      {/* Back nav + print */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={backHref}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-sbc-red transition-colors"
        >
          ← {backLabel}
        </Link>
        <PrintButton />
      </div>

      {/* ── Section 1: Report Header ─────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <SectionHeading
          title="MONTHLY SERVICE TEAM REPORT"
          subtitle={`${report.serviceTeamName} — ${period}`}
        />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
          <Field label="Service Team" value={report.serviceTeamName} />
          <Field label="Period" value={period} />
          <Field label="HOSTs" value={report.hodName} />
          <Field label="Report Status">
            <StatusBadge status={report.status} />
          </Field>
          {report.assistantOne && (
            <Field label="Assistant 1" value={report.assistantOne} />
          )}
          {report.assistantTwo && (
            <Field label="Assistant 2" value={report.assistantTwo} />
          )}
          <Field label="Members Enrolled" value={String(report.totalMembersEnrolled)} />
          {report.submittedAt && (
            <Field label="Submitted" value={fmtDate(report.submittedAt)} />
          )}
          {report.hodSignature && (
            <Field label="HOSTs Signature" value={report.hodSignature} />
          )}
        </div>
      </div>

      {/* ── Section 2: Member Grades ─────────────────────────────────── */}
      {hasNewSections && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <SectionHeading title="GOALS FOR THE MONTH" />
          {report.goalsForMonth.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No goals recorded.</p>
          ) : (
            <div className="divide-y divide-sbc-grey dark:divide-white/10">
              {report.goalsForMonth.map((goal) => (
                <div key={goal.goalNumber} className="grid grid-cols-1 gap-3 p-5 md:grid-cols-[1fr_160px]">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-1">
                      Goal {goal.goalNumber}
                    </p>
                    <p className="text-sm text-sbc-black dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {goal.goal}
                    </p>
                    {goal.remarks && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {goal.remarks}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-1">
                      Achieved?
                    </p>
                    <p className="text-sm font-medium text-sbc-black dark:text-white">{goal.achieved}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(report.challengesForMonth || report.goalsNextMonth || report.serviceTeamNeeds) && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <SectionHeading title="PLANNING NOTES" />
          <div className="p-5 space-y-4">
            {report.challengesForMonth && (
              <TextBlock label="Challenges for the Month" value={report.challengesForMonth} />
            )}
            {report.goalsNextMonth && (
              <TextBlock label="Goals for Next Month" value={report.goalsNextMonth} />
            )}
            {report.serviceTeamNeeds && (
              <TextBlock label="Service Team Needs for Next Month" value={report.serviceTeamNeeds} />
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {report.budget && <Field label="Budget" value={report.budget} />}
              {report.budgetFinancing && <Field label="Budget Financing" value={report.budgetFinancing} />}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <SectionHeading
          title="SERVICE TEAM MEMBERS PERFORMANCE ASSESSMENT"
          subtitle={`${memberGrades.length} member${memberGrades.length !== 1 ? 's' : ''} graded`}
        />
        {memberGrades.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No member grades recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/40">
                  <th className="text-left px-5 py-2.5 font-medium text-gray-500 uppercase tracking-wider min-w-[160px]">
                    Member
                  </th>
                  {GRADE_FIELDS.map((f) => (
                    <th
                      key={f}
                      className="text-center px-3 py-2.5 font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {GRADE_COLUMN_LABELS[f]}
                    </th>
                  ))}
                  <th className="text-center px-3 py-2.5 font-medium text-gray-500 uppercase tracking-wider">
                    Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {memberGrades.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5"
                  >
                    <td className="px-5 py-2.5 text-sbc-black dark:text-white font-medium text-sm">
                      {g.memberFullName}
                    </td>
                    <td className="px-3 py-2.5 text-center">{gradeCell(g.generalAttitude)}</td>
                    <td className="px-3 py-2.5 text-center">{gradeCell(g.teamwork)}</td>
                    <td className="px-3 py-2.5 text-center">{gradeCell(g.punctuality)}</td>
                    <td className="px-3 py-2.5 text-center">{gradeCell(g.appearance)}</td>
                    <td className="px-3 py-2.5 text-center">{gradeCell(g.attendance)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-bold ${avgColor(g.averageScore)}`}>
                        {g.averageScore != null ? g.averageScore.toFixed(1) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 3: Observations ──────────────────────────────────── */}
      {report.naExplanation && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <SectionHeading title="N/A EXPLANATION" />
          <div className="p-5">
            <p className="text-sm text-sbc-black dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
              {report.naExplanation}
            </p>
          </div>
        </div>
      )}

      {report.serviceTeamLeaderComments && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <SectionHeading title="COMMENTS BY SERVICE TEAM LEADER" />
          <div className="p-5 space-y-4">
            <TextBlock label="Comments" value={report.serviceTeamLeaderComments} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Confirmed" value={report.confirmation ? 'Yes' : 'No'} />
              <Field label="Signature" value={report.signature ?? undefined} />
              <Field label="Date" value={report.confirmationDate ? fmtDate(report.confirmationDate) : undefined} />
            </div>
          </div>
        </div>
      )}

      {(report.generalObservations || report.challengesEncountered) && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <SectionHeading title="OBSERVATIONS & CHALLENGES" />
          <div className="p-5 space-y-4">
            {report.generalObservations && (
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
                  General Observations
                </p>
                <p className="text-sm text-sbc-black dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {report.generalObservations}
                </p>
              </div>
            )}
            {report.challengesEncountered && (
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
                  Challenges Encountered
                </p>
                <p className="text-sm text-sbc-black dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {report.challengesEncountered}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section 4: Pastor Review ─────────────────────────────────── */}
      {showPastorReview && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <SectionHeading
            title="SUPERVISING PASTOR REVIEW"
            subtitle={
              pastorReview?.submittedAt
                ? `Submitted ${fmtDate(pastorReview.submittedAt)} by ${pastorReview.reviewerName}`
                : pastorReview
                ? 'Draft — not yet submitted'
                : 'No review submitted yet'
            }
          />
          {!pastorReview ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Awaiting pastor review.</p>
          ) : (
            <div className="p-5 space-y-4">
              {showPastorReviewGrades && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
                    HOSTs Performance Assessment
                  </p>
                  <div className="space-y-0">
                    <ReviewGradeRow label="General Attitude" grade={pastorReview.hodGeneralAttitude} />
                    <ReviewGradeRow label="Teamwork" grade={pastorReview.hodTeamwork} />
                    <ReviewGradeRow label="Punctuality" grade={pastorReview.hodPunctuality} />
                    <ReviewGradeRow label="Appearance / Personal Hygiene" grade={pastorReview.hodAppearance} />
                    <ReviewGradeRow label="Attendance" grade={pastorReview.hodAttendance} />
                  </div>
                </div>
              )}
              {pastorReview.comments && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
                    Review
                  </p>
                  <p className="text-sm text-sbc-black dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {pastorReview.comments}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-x-8 gap-y-1 pt-2 text-xs text-gray-400">
                {pastorReview.reviewerName && (
                  <span>Reviewed by: <span className="text-sbc-black dark:text-white">{pastorReview.reviewerName}</span></span>
                )}
                {pastorReview.reviewDate && (
                  <span>Review date: <span className="text-sbc-black dark:text-white">{fmtDate(pastorReview.reviewDate)}</span></span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 5: Committee Review ────────────────────────────────────── */}
      {showHeadReview && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
          <SectionHeading
            title="COMMITTEE REVIEW"
            subtitle={
              headReview?.submittedAt
                ? `Submitted ${fmtDate(headReview.submittedAt)} by ${headReview.reviewerName}`
                : headReview
                ? 'Draft — not yet submitted'
                : 'No review submitted yet'
            }
          />
          {!headReview ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Awaiting committee review.</p>
          ) : (
            <div className="p-5 space-y-4">
              {headReview.overallComments && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
                    Review
                  </p>
                  <p className="text-sm text-sbc-black dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {headReview.overallComments}
                  </p>
                </div>
              )}
              {headReview.supervisorReviewed && (
                <div className="space-y-0">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
                    Supervising Pastor Performance Assessment
                  </p>
                  <ReviewGradeRow
                    label={headReview.supervisorReviewed}
                    grade={headReview.supervisorPerformance ?? 'NOT_APPLICABLE'}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-x-8 gap-y-1 pt-2 text-xs text-gray-400">
                {headReview.reviewerName && (
                  <span>Reviewed by: <span className="text-sbc-black dark:text-white">{headReview.reviewerName}</span></span>
                )}
                {headReview.reviewDate && (
                  <span>Review date: <span className="text-sbc-black dark:text-white">{fmtDate(headReview.reviewDate)}</span></span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Utility sub-components ───────────────────────────────────────────────────

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">{label}</p>
      <p className="text-sm text-sbc-black dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
        {value}
      </p>
    </div>
  )
}

function Field({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-0.5">{label}</p>
      {children ?? (
        <p className="text-sm text-sbc-black dark:text-white">{value ?? '—'}</p>
      )}
    </div>
  )
}
