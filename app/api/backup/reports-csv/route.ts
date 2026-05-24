import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeAverageScore, type GradeValue } from '@/lib/grade-utils'
import { Grade, ReportStatus } from '@prisma/client'
import Papa from 'papaparse'

const TEMPLATE_COLUMNS = [
  'Team',
  'HOSTs',
  'Supervising Pastor',
  'Month',
  'Year',
  'Status',
  'Assistant I',
  'Assistant II',
  'Goal 1',
  'Goal 1 Achieved',
  'Goal 1 Remarks',
  'Goal 2',
  'Goal 2 Achieved',
  'Goal 2 Remarks',
  'Goal 3',
  'Goal 3 Achieved',
  'Goal 3 Remarks',
  'Goal 4',
  'Goal 4 Achieved',
  'Goal 4 Remarks',
  'Goal 5',
  'Goal 5 Achieved',
  'Goal 5 Remarks',
  'Challenges',
  'Goals Next Month',
  'Service Team Needs',
  'Budget',
  'Budget Financing',
  'Leader Comments',
  'HOD Signature',
  'Submitted At',
  'Member Name',
  'Member Phone',
  'General Attitude',
  'Teamwork',
  'Punctuality',
  'Appearance',
  'Attendance',
  'N/A Explanation',
  'Supervising Pastor Review',
  'SP General Attitude',
  'SP Teamwork',
  'SP Punctuality',
  'SP Appearance',
  'SP Attendance',
  'SP Signature',
  'SP Review Date',
  'SP Submitted At',
  'Committee Reviewer',
  'Committee Review',
  'Committee Supervisor Performance',
  'Committee Signature',
  'Committee Review Date',
  'Committee Submitted At',
]

const TEMPLATE_SAMPLE = [
  'FOLLOW UP',
  'HOD Ekklesi',
  'Pst. Andrea Ogunba',
  'May',
  '2026',
  'HEAD_REVIEWED',
  'Assistant One',
  'Assistant Two',
  'Improve follow-up calls',
  'Yes',
  'Completed during the month',
  'Train new volunteers',
  'Partial',
  'Continues next month',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'Transport scheduling was difficult',
  'Strengthen member follow-up',
  'More training materials',
  '50000',
  'Summit Bible Church',
  'The team made steady progress.',
  'HOD Ekklesi',
  '2026-05-31',
  'Charles Omaha',
  '08000000001',
  '5',
  '4',
  '5',
  '4',
  '5',
  '',
  'Good report and team leadership.',
  '4',
  '4',
  '5',
  '4',
  '5',
  'Pst. Andrea Ogunba',
  '2026-06-02',
  '2026-06-02',
  'Committee L_Name',
  'Reviewed and approved.',
  '4',
  'Committee L_Name',
  '2026-06-03',
  '2026-06-03',
]

type CsvRow = Record<string, string>

function cell(row: CsvRow, key: string) {
  return (row[key] ?? '').trim()
}

function keyOf(value: string) {
  return value.trim().toLowerCase()
}

function toMonth(value: string) {
  const raw = value.trim()
  const numeric = Number(raw)
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const index = months.findIndex((m) => m.startsWith(raw.toLowerCase()))
  return index >= 0 ? index + 1 : null
}

function toDate(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toStatus(value: string, hasCommittee: boolean, hasPastor: boolean): ReportStatus {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_')
  if (Object.values(ReportStatus).includes(normalized as ReportStatus)) return normalized as ReportStatus
  if (hasCommittee) return 'HEAD_REVIEWED'
  if (hasPastor) return 'PASTOR_REVIEWED'
  return 'SUBMITTED'
}

function toGrade(value: string): Grade {
  const normalized = value.trim().toUpperCase()
  const byNumber: Record<string, Grade> = {
    '5': 'FIVE',
    FIVE: 'FIVE',
    '4': 'FOUR',
    FOUR: 'FOUR',
    '3': 'THREE',
    THREE: 'THREE',
    '2': 'TWO',
    TWO: 'TWO',
    '1': 'ONE',
    ONE: 'ONE',
    N: 'NOT_APPLICABLE',
    NA: 'NOT_APPLICABLE',
    'N/A': 'NOT_APPLICABLE',
    NOT_APPLICABLE: 'NOT_APPLICABLE',
  }
  return byNumber[normalized] ?? 'NOT_APPLICABLE'
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? fullName,
    lastName: parts.slice(1).join(' ') || parts[0] || fullName,
  }
}

function reportGroupKey(row: CsvRow) {
  return [
    keyOf(cell(row, 'Team')),
    keyOf(cell(row, 'HOSTs')),
    keyOf(cell(row, 'Month')),
    keyOf(cell(row, 'Year')),
  ].join('|')
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const csv = Papa.unparse({ fields: TEMPLATE_COLUMNS, data: [TEMPLATE_SAMPLE] })
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sbc-full-report-import-template.csv"',
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let rows: CsvRow[] = []
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No CSV file uploaded' }, { status: 400 })
    }
    const text = await (file as File).text()
    const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true })
    if (parsed.errors.length > 0) {
      return Response.json({ error: parsed.errors[0]?.message ?? 'Could not parse CSV' }, { status: 400 })
    }
    rows = parsed.data.filter((row) => Object.values(row).some((value) => String(value ?? '').trim()))
  } catch {
    return Response.json({ error: 'Could not read CSV file' }, { status: 400 })
  }

  if (rows.length === 0) {
    return Response.json({ error: 'CSV file has no rows' }, { status: 400 })
  }

  const grouped = new Map<string, CsvRow[]>()
  rows.forEach((row) => {
    const groupKey = reportGroupKey(row)
    if (!grouped.has(groupKey)) grouped.set(groupKey, [])
    grouped.get(groupKey)!.push(row)
  })

  const result = {
    reportsCreated: 0,
    reportsUpdated: 0,
    memberGradesImported: 0,
    pastorReviewsImported: 0,
    committeeReviewsImported: 0,
    skipped: [] as { group: string; reason: string }[],
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const groupRows of grouped.values()) {
        const first = groupRows[0]
        const teamName = cell(first, 'Team')
        const hodName = cell(first, 'HOSTs')
        const month = toMonth(cell(first, 'Month'))
        const year = Number(cell(first, 'Year'))
        const groupLabel = `${teamName || 'Unknown team'} / ${hodName || 'Unknown HOSTs'} / ${cell(first, 'Month')} ${cell(first, 'Year')}`

        if (!teamName || !hodName || !month || !Number.isInteger(year)) {
          result.skipped.push({ group: groupLabel, reason: 'Team, HOSTs, Month and Year are required' })
          continue
        }

        const [team, hodProfile] = await Promise.all([
          tx.serviceTeam.findUnique({ where: { name: teamName } }),
          tx.hodProfile.findFirst({ where: { hodName } }),
        ])

        if (!team) {
          result.skipped.push({ group: groupLabel, reason: `Service team "${teamName}" was not found` })
          continue
        }
        if (!hodProfile) {
          result.skipped.push({ group: groupLabel, reason: `HOSTs "${hodName}" was not found` })
          continue
        }

        const pastorName = cell(first, 'Supervising Pastor')
        const pastorProfile = pastorName
          ? await tx.pastorProfile.findFirst({ where: { pastorName } })
          : null

        if (pastorName && !pastorProfile) {
          result.skipped.push({ group: groupLabel, reason: `Supervising Pastor "${pastorName}" was not found` })
          continue
        }

        const memberRows = groupRows.filter((row) => cell(row, 'Member Name') || cell(row, 'Member Phone'))
        const hasPastorReview = Boolean(cell(first, 'Supervising Pastor Review') || cell(first, 'SP Submitted At'))
        const hasCommitteeReview = Boolean(cell(first, 'Committee Review') || cell(first, 'Committee Submitted At'))
        const status = toStatus(cell(first, 'Status'), hasCommitteeReview, hasPastorReview)

        const goalsForMonth = [1, 2, 3, 4, 5]
          .map((goalNumber) => ({
            goalNumber,
            goal: cell(first, `Goal ${goalNumber}`),
            achieved: cell(first, `Goal ${goalNumber} Achieved`) || 'Not yet',
            remarks: cell(first, `Goal ${goalNumber} Remarks`) || null,
          }))
          .filter((goal) => goal.goal)

        const reportData = {
          reportMonth: month,
          reportYear: year,
          status,
          hodName,
          assistantOne: cell(first, 'Assistant I') || null,
          assistantTwo: cell(first, 'Assistant II') || null,
          totalMembersEnrolled: memberRows.length,
          goalsForMonth,
          challengesForMonth: cell(first, 'Challenges') || null,
          goalsNextMonth: cell(first, 'Goals Next Month') || null,
          serviceTeamNeeds: cell(first, 'Service Team Needs') || null,
          budget: cell(first, 'Budget') || null,
          budgetFinancing: cell(first, 'Budget Financing') || null,
          serviceTeamLeaderComments: cell(first, 'Leader Comments') || null,
          confirmation: true,
          signature: cell(first, 'HOD Signature') || hodName,
          confirmationDate: toDate(cell(first, 'Submitted At')),
          currentStep: 2,
          naExplanation: cell(first, 'N/A Explanation') || null,
          hodSignature: cell(first, 'HOD Signature') || hodName,
          submittedAt: toDate(cell(first, 'Submitted At')) ?? new Date(),
          hodProfileId: hodProfile.id,
          serviceTeamId: team.id,
          createdById: session.user.id,
        }

        const existing = await tx.hodReport.findUnique({
          where: {
            hodProfileId_serviceTeamId_reportMonth_reportYear: {
              hodProfileId: hodProfile.id,
              serviceTeamId: team.id,
              reportMonth: month,
              reportYear: year,
            },
          },
        })

        const report = existing
          ? await tx.hodReport.update({ where: { id: existing.id }, data: reportData })
          : await tx.hodReport.create({ data: reportData })

        if (existing) result.reportsUpdated += 1
        else result.reportsCreated += 1

        await tx.reportMemberGrade.deleteMany({ where: { reportId: report.id } })
        for (const row of memberRows) {
          const fullName = cell(row, 'Member Name')
          const phone = cell(row, 'Member Phone') || `import-${report.id}-${keyOf(fullName).replace(/[^a-z0-9]+/g, '-')}`
          if (!fullName) continue

          const nameParts = splitName(fullName)
          const member = await tx.serviceTeamMember.upsert({
            where: { phone },
            update: { fullName, firstName: nameParts.firstName, lastName: nameParts.lastName, isActive: true },
            create: {
              fullName,
              firstName: nameParts.firstName,
              lastName: nameParts.lastName,
              phone,
              isActive: true,
              createdById: session.user.id,
            },
          })

          await tx.serviceTeamMemberAssignment.upsert({
            where: { memberId_teamId: { memberId: member.id, teamId: team.id } },
            update: {},
            create: { memberId: member.id, teamId: team.id },
          })

          const gradeRecord = {
            generalAttitude: toGrade(cell(row, 'General Attitude')),
            teamwork: toGrade(cell(row, 'Teamwork')),
            punctuality: toGrade(cell(row, 'Punctuality')),
            appearance: toGrade(cell(row, 'Appearance')),
            attendance: toGrade(cell(row, 'Attendance')),
          }
          const averageScore = computeAverageScore(gradeRecord as Record<keyof typeof gradeRecord, GradeValue>)

          await tx.reportMemberGrade.create({
            data: {
              reportId: report.id,
              memberId: member.id,
              ...gradeRecord,
              averageScore,
            },
          })
          result.memberGradesImported += 1
        }

        let pastorReviewId: string | null = null
        if (hasPastorReview && pastorProfile) {
          const pastorReview = await tx.pastorReview.upsert({
            where: { reportId: report.id },
            update: {
              pastorId: pastorProfile.id,
              reviewedById: pastorProfile.userId,
              hodGeneralAttitude: toGrade(cell(first, 'SP General Attitude')),
              hodTeamwork: toGrade(cell(first, 'SP Teamwork')),
              hodPunctuality: toGrade(cell(first, 'SP Punctuality')),
              hodAppearance: toGrade(cell(first, 'SP Appearance')),
              hodAttendance: toGrade(cell(first, 'SP Attendance')),
              comments: cell(first, 'Supervising Pastor Review') || null,
              confirmed: true,
              signature: cell(first, 'SP Signature') || pastorProfile.pastorName,
              reviewDate: toDate(cell(first, 'SP Review Date')),
              submittedAt: toDate(cell(first, 'SP Submitted At')) ?? new Date(),
            },
            create: {
              reportId: report.id,
              pastorId: pastorProfile.id,
              reviewedById: pastorProfile.userId,
              hodGeneralAttitude: toGrade(cell(first, 'SP General Attitude')),
              hodTeamwork: toGrade(cell(first, 'SP Teamwork')),
              hodPunctuality: toGrade(cell(first, 'SP Punctuality')),
              hodAppearance: toGrade(cell(first, 'SP Appearance')),
              hodAttendance: toGrade(cell(first, 'SP Attendance')),
              comments: cell(first, 'Supervising Pastor Review') || null,
              confirmed: true,
              signature: cell(first, 'SP Signature') || pastorProfile.pastorName,
              reviewDate: toDate(cell(first, 'SP Review Date')),
              submittedAt: toDate(cell(first, 'SP Submitted At')) ?? new Date(),
            },
          })
          pastorReviewId = pastorReview.id
          result.pastorReviewsImported += 1
        }

        if (hasCommitteeReview) {
          const reviewerName = cell(first, 'Committee Reviewer')
          const headProfile = reviewerName
            ? await tx.headOfSupervisorProfile.findFirst({ where: { headName: reviewerName } })
            : null
          const reviewedById = headProfile?.userId ?? session.user.id

          await tx.headReview.upsert({
            where: { reportId: report.id },
            update: {
              pastorReviewId,
              reviewedById,
              headProfileId: headProfile?.id ?? null,
              overallComments: cell(first, 'Committee Review') || null,
              supervisorReviewed: pastorName || null,
              supervisorPerformance: toGrade(cell(first, 'Committee Supervisor Performance')),
              confirmed: true,
              signature: cell(first, 'Committee Signature') || reviewerName || 'Committee',
              reviewDate: toDate(cell(first, 'Committee Review Date')),
              submittedAt: toDate(cell(first, 'Committee Submitted At')) ?? new Date(),
            },
            create: {
              reportId: report.id,
              pastorReviewId,
              reviewedById,
              headProfileId: headProfile?.id ?? null,
              overallComments: cell(first, 'Committee Review') || null,
              supervisorReviewed: pastorName || null,
              supervisorPerformance: toGrade(cell(first, 'Committee Supervisor Performance')),
              confirmed: true,
              signature: cell(first, 'Committee Signature') || reviewerName || 'Committee',
              reviewDate: toDate(cell(first, 'Committee Review Date')),
              submittedAt: toDate(cell(first, 'Committee Submitted At')) ?? new Date(),
            },
          })
          result.committeeReviewsImported += 1
        }
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'REPORTS_CSV_IMPORTED',
        description: `Imported reports CSV: ${result.reportsCreated} created, ${result.reportsUpdated} updated, ${result.skipped.length} skipped.`,
      },
    }).catch(() => null)

    return Response.json({ success: true, ...result })
  } catch (err) {
    console.error('[POST /api/backup/reports-csv]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'CSV import failed' }, { status: 500 })
  }
}
