import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import * as xlsx from 'xlsx'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const GRADE_NUMS: Record<string, number | string> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, NOT_APPLICABLE: 'N/A',
}

// ─── GET /api/backup/reports ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const monthParam = url.searchParams.get('month')
  const yearParam = url.searchParams.get('year')

  const where: Record<string, unknown> = {}
  if (monthParam) where.reportMonth = parseInt(monthParam)
  if (yearParam) where.reportYear = parseInt(yearParam)

  try {
    const reports = await prisma.hodReport.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        serviceTeam: { select: { name: true } },
        hodProfile: { select: { hodName: true } },
        pastorReview: {
          include: {
            pastor: { select: { pastorName: true } },
          },
        },
        headReview: {
          include: {
            reviewedBy: { select: { firstName: true, lastName: true } },
          },
        },
        memberGrades: {
          include: { member: { select: { fullName: true, phone: true } } },
        },
      },
    })

    const wb = xlsx.utils.book_new()

    // Sheet 1: Report Summary
    const summaryRows = [
      ['Team', 'HOSTs', 'Month', 'Year', 'Status', 'Members Enrolled', 'Submitted At'],
      ...reports.map((r) => [
        r.serviceTeam.name,
        r.hodProfile.hodName,
        MONTHS[r.reportMonth - 1],
        r.reportYear,
        r.status,
        r.totalMembersEnrolled,
        r.submittedAt?.toISOString() ?? '',
      ]),
    ]
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(summaryRows), 'Report Summary')

    // Sheet 2: Member Grades
    const gradeRows = [
      ['Team', 'HOSTs', 'Month', 'Year', 'Member Name', 'Phone', 'General Attitude', 'Teamwork', 'Punctuality', 'Appearance', 'Attendance', 'Average Score'],
      ...reports.flatMap((r) =>
        r.memberGrades.map((g) => [
          r.serviceTeam.name,
          r.hodProfile.hodName,
          MONTHS[r.reportMonth - 1],
          r.reportYear,
          g.member.fullName,
          g.member.phone,
          GRADE_NUMS[g.generalAttitude] ?? g.generalAttitude,
          GRADE_NUMS[g.teamwork] ?? g.teamwork,
          GRADE_NUMS[g.punctuality] ?? g.punctuality,
          GRADE_NUMS[g.appearance] ?? g.appearance,
          GRADE_NUMS[g.attendance] ?? g.attendance,
          g.averageScore ?? '',
        ])
      ),
    ]
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(gradeRows), 'Member Grades')

    // Sheet 3: Supervising Pastor Reviews
    const pastorReviewRows = [
      [
        'Team',
        'HOSTs',
        'Month',
        'Year',
        'Supervising Pastor',
        'HOSTs Attitude',
        'HOSTs Teamwork',
        'HOSTs Punctuality',
        'HOSTs Appearance',
        'HOSTs Attendance',
        'Comments',
        'Signature',
        'Review Date',
        'Submitted At',
      ],
      ...reports
        .filter((r) => r.pastorReview)
        .map((r) => [
          r.serviceTeam.name,
          r.hodProfile.hodName,
          MONTHS[r.reportMonth - 1],
          r.reportYear,
          r.pastorReview!.pastor.pastorName,
          GRADE_NUMS[r.pastorReview!.hodGeneralAttitude] ?? '',
          GRADE_NUMS[r.pastorReview!.hodTeamwork] ?? '',
          GRADE_NUMS[r.pastorReview!.hodPunctuality] ?? '',
          GRADE_NUMS[r.pastorReview!.hodAppearance] ?? '',
          GRADE_NUMS[r.pastorReview!.hodAttendance] ?? '',
          r.pastorReview!.comments ?? '',
          r.pastorReview!.signature ?? '',
          r.pastorReview!.reviewDate?.toISOString() ?? '',
          r.pastorReview!.submittedAt?.toISOString() ?? '',
        ]),
    ]
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(pastorReviewRows), 'Supervising Pastor Reviews')

    // Sheet 4: Committee Reviews
    const committeeReviewRows = [
      [
        'Team',
        'HOSTs',
        'Month',
        'Year',
        'Committee Reviewer',
        'Review',
        'Supervising Pastor Reviewed',
        'Supervising Pastor Performance',
        'Signature',
        'Review Date',
        'Submitted At',
      ],
      ...reports
        .filter((r) => r.headReview)
        .map((r) => {
          const reviewer = [
            r.headReview!.reviewedBy.firstName,
            r.headReview!.reviewedBy.lastName,
          ].filter(Boolean).join(' ')

          return [
            r.serviceTeam.name,
            r.hodProfile.hodName,
            MONTHS[r.reportMonth - 1],
            r.reportYear,
            reviewer,
            r.headReview!.overallComments ?? '',
            r.headReview!.supervisorReviewed ?? '',
            r.headReview!.supervisorPerformance
              ? GRADE_NUMS[r.headReview!.supervisorPerformance] ?? r.headReview!.supervisorPerformance
              : '',
            r.headReview!.signature ?? '',
            r.headReview!.reviewDate?.toISOString() ?? '',
            r.headReview!.submittedAt?.toISOString() ?? '',
          ]
        }),
    ]
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(committeeReviewRows), 'Committee Reviews')

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    // Slice to own ArrayBuffer so TS sees ArrayBuffer (BodyInit-compatible)
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer

    const month = monthParam ? MONTHS[parseInt(monthParam) - 1] : 'All'
    const year = yearParam ?? 'All'
    const filename = `sbc-reports-${month}-${year}.xlsx`

    return new Response(ab, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[GET /api/backup/reports]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
