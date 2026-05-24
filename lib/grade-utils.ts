export const GRADE_ENUM_VALUES = ['FIVE', 'FOUR', 'THREE', 'TWO', 'ONE', 'NOT_APPLICABLE'] as const
export type GradeValue = (typeof GRADE_ENUM_VALUES)[number]

export const GRADE_TO_NUM: Record<GradeValue, number | null> = {
  FIVE: 5,
  FOUR: 4,
  THREE: 3,
  TWO: 2,
  ONE: 1,
  NOT_APPLICABLE: null,
}

export const GRADE_LABELS: Record<GradeValue, string> = {
  FIVE: '5',
  FOUR: '4',
  THREE: '3',
  TWO: '2',
  ONE: '1',
  NOT_APPLICABLE: 'N/A',
}

export const GRADE_TOOLTIP: Record<GradeValue, string> = {
  FIVE: '5 — Outstanding',
  FOUR: '4 — Very Good',
  THREE: '3 — Good',
  TWO: '2 — Fair',
  ONE: '1 — Poor',
  NOT_APPLICABLE: 'Not Applicable',
}

// Exact column headers from hod-monthly-reports-form.xml
export const GRADE_COLUMN_LABELS: Record<string, string> = {
  generalAttitude: 'General Attitude',
  teamwork: 'Ability to Work as Team',
  punctuality: 'Punctuality',
  appearance: 'Appearance / Personal Hygiene',
  attendance: 'Attendance',
}

export const GRADE_FIELDS = [
  'generalAttitude',
  'teamwork',
  'punctuality',
  'appearance',
  'attendance',
] as const

export type GradeField = (typeof GRADE_FIELDS)[number]

export function computeAverageScore(
  grades: Record<GradeField, string>
): number | null {
  const values = GRADE_FIELDS
    .map((f) => GRADE_TO_NUM[grades[f] as GradeValue] ?? null)
    .filter((v): v is number => v !== null)
  return values.length > 0
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null
}
