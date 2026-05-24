import { NextRequest } from 'next/server'
import Papa from 'papaparse'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface CsvRow {
  FirstName?: string
  LastName?: string
  Phone?: string
  HomeLocation?: string
  ServiceTeam?: string
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify HOD owns at least one team
  const hodProfile = await prisma.hodProfile.findUnique({
    where: { userId: session.user.id },
    include: { serviceTeams: { select: { id: true, name: true } } },
  })
  if (!hodProfile && !session.user.roles.includes('ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const csvText = await (file as File).text()
  const { data, errors } = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (errors.length > 0) {
    return Response.json(
      { error: 'CSV parse error', details: errors.map((e) => e.message) },
      { status: 400 }
    )
  }

  let added = 0
  let skipped = 0
  const parseErrors: string[] = []

  for (const [i, row] of data.entries()) {
    const rowNum = i + 2 // 1-indexed, +1 for header
    const firstName = row.FirstName?.trim()
    const lastName = row.LastName?.trim()
    const phone = row.Phone?.trim()
    const homeLocation = row.HomeLocation?.trim() || null
    const teamName = row.ServiceTeam?.trim()

    if (!firstName || !lastName || !phone) {
      parseErrors.push(`Row ${rowNum}: missing FirstName, LastName, or Phone`)
      continue
    }

    // Find team
    let teamId: string | null = null
    if (teamName && hodProfile) {
      const team = hodProfile.serviceTeams.find(
        (t) => t.name.toLowerCase() === teamName.toLowerCase()
      )
      teamId = team?.id ?? null
    }
    if (!teamId && hodProfile?.serviceTeams[0]) {
      teamId = hodProfile.serviceTeams[0].id
    }
    if (!teamId) {
      parseErrors.push(`Row ${rowNum}: could not resolve service team`)
      continue
    }

    try {
      const existing = await prisma.serviceTeamMember.findUnique({
        where: { phone },
      })

      if (existing) {
        // Add assignment if not present
        await prisma.serviceTeamMemberAssignment.upsert({
          where: { memberId_teamId: { memberId: existing.id, teamId } },
          update: {},
          create: { memberId: existing.id, teamId },
        })
        skipped++
      } else {
        const fullName = `${firstName} ${lastName}`
        const member = await prisma.serviceTeamMember.create({
          data: {
            firstName,
            lastName,
            fullName,
            phone,
            homeLocation,
            createdById: session.user.id,
            teamAssignments: { create: { teamId } },
          },
        })
        await prisma.activityLog.create({
          data: {
            userId: session.user.id,
            action: 'MEMBER_ADDED_CSV',
            description: `CSV import: member "${fullName}" added`,
            entityType: 'ServiceTeamMember',
            entityId: member.id,
          },
        }).catch(() => null)
        added++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      parseErrors.push(`Row ${rowNum}: ${msg}`)
    }
  }

  return Response.json({ added, skipped, errors: parseErrors })
}
