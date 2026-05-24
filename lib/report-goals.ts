import type { ReportGoal } from '@/components/report/ReportDetail'

const ACHIEVED = new Set(['Not yet', 'Yes', 'Partial'])

export function normalizeReportGoals(raw: unknown): ReportGoal[] {
  if (!Array.isArray(raw)) return []

  return raw.slice(0, 5).map((item, index) => {
    const goal = item as Partial<ReportGoal>

    return {
      goalNumber: Number(goal.goalNumber) || index + 1,
      goal: typeof goal.goal === 'string' ? goal.goal : '',
      achieved: typeof goal.achieved === 'string' && ACHIEVED.has(goal.achieved)
        ? goal.achieved
        : 'Not yet',
      remarks: typeof goal.remarks === 'string' && goal.remarks.trim() ? goal.remarks : null,
    }
  }).filter((goal) => goal.goal.trim())
}
