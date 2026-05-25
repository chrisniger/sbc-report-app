import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import Papa from 'papaparse'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

type Role = 'ADMIN' | 'PASTOR' | 'HEAD_OF_SUPERVISOR' | 'SUPERVISOR_PASTOR' | 'HOD'

const TEMPLATE_COLUMNS = [
  'First Name',
  'Last Name',
  'Username',
  'Email',
  'Phone',
  'Roles',
  'Password',
  'Must Change Password',
  'Active',
  'Service Teams',
  'Supervising Pastor',
  'Committee Head',
]

const TEMPLATE_SAMPLE = [
  'Grace',
  'Leader',
  'gleader',
  'grace@example.com',
  '08000000000',
  'HOD',
  'ChangeMe@123',
  'Yes',
  'Yes',
  'FOLLOW UP; EKKLESIA TEENS CHURCH',
  'Pst. Andrea Ogunba',
  '',
]

type CsvRow = Record<string, string>

function cell(row: CsvRow, key: string) {
  return (row[key] ?? '').trim()
}

function truthy(value: string, fallback: boolean) {
  if (!value) return fallback
  return ['yes', 'true', '1', 'active'].includes(value.trim().toLowerCase())
}

function splitList(value: string) {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseRoles(value: string): Role[] {
  const aliases: Record<string, Role> = {
    ADMIN: 'ADMIN',
    PASTOR: 'PASTOR',
    COMMITTEE: 'HEAD_OF_SUPERVISOR',
    HEAD: 'HEAD_OF_SUPERVISOR',
    HEAD_OF_SUPERVISOR: 'HEAD_OF_SUPERVISOR',
    SUPERVISING_PASTOR: 'SUPERVISOR_PASTOR',
    SUPERVISOR_PASTOR: 'SUPERVISOR_PASTOR',
    SP: 'SUPERVISOR_PASTOR',
    HOST: 'HOD',
    HOSTS: 'HOD',
    HOD: 'HOD',
  }

  const roles = splitList(value)
    .map((role) => aliases[role.toUpperCase().replace(/\s+/g, '_')])
    .filter((role): role is Role => Boolean(role))

  return Array.from(new Set(roles))
}

async function findConflicts(username: string, email: string | null, phone: string | null) {
  const [existingByUsername, existingByEmail, existingByPhone] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    email ? prisma.user.findFirst({ where: { email } }) : Promise.resolve(null),
    phone ? prisma.user.findFirst({ where: { phone } }) : Promise.resolve(null),
  ])

  const conflict =
    (existingByEmail && existingByEmail.username !== username) ||
    (existingByPhone && existingByPhone.username !== username)

  return { existingByUsername, conflict }
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
      'Content-Disposition': 'attachment; filename="sbc-user-import-template.csv"',
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

  const result = {
    usersCreated: 0,
    usersUpdated: 0,
    profilesCreated: 0,
    skipped: [] as { username: string; reason: string }[],
  }

  const defaultPassword = process.env.USER_IMPORT_DEFAULT_PASSWORD || 'ChangeMe@123'

  for (const row of rows) {
    const firstName = cell(row, 'First Name')
    const lastName = cell(row, 'Last Name')
    const username = cell(row, 'Username')
    const email = cell(row, 'Email') || null
    const phone = cell(row, 'Phone') || null
    const roles = parseRoles(cell(row, 'Roles'))
    const password = cell(row, 'Password') || defaultPassword

    if (!firstName || !username || roles.length === 0) {
      result.skipped.push({ username: username || '(blank)', reason: 'First Name, Username and Roles are required' })
      continue
    }

    if (password.length < 8) {
      result.skipped.push({ username, reason: 'Password must be at least 8 characters' })
      continue
    }

    const { existingByUsername, conflict } = await findConflicts(username, email, phone)
    if (conflict) {
      result.skipped.push({ username, reason: 'Email or phone is already used by another user' })
      continue
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const displayName = `${firstName} ${lastName}`.trim()
    const mustChangePassword = truthy(cell(row, 'Must Change Password'), true)
    const isActive = truthy(cell(row, 'Active'), true)

    try {
      await prisma.$transaction(async (tx) => {
        const user = existingByUsername
          ? await tx.user.update({
              where: { id: existingByUsername.id },
              data: {
                firstName,
                lastName: lastName || null,
                email,
                phone,
                roles,
                isActive,
                mustChangePassword,
                passwordHash,
              },
            })
          : await tx.user.create({
              data: {
                firstName,
                lastName: lastName || null,
                username,
                email,
                phone,
                roles,
                passwordHash,
                isActive,
                mustChangePassword,
              },
            })

        if (existingByUsername) result.usersUpdated += 1
        else result.usersCreated += 1

        if (roles.includes('HEAD_OF_SUPERVISOR')) {
          const existing = await tx.headOfSupervisorProfile.findUnique({ where: { userId: user.id } })
          if (!existing) result.profilesCreated += 1
          await tx.headOfSupervisorProfile.upsert({
            where: { userId: user.id },
            update: { headName: displayName },
            create: { userId: user.id, headName: displayName },
          })
        }

        if (roles.includes('SUPERVISOR_PASTOR')) {
          const headName = cell(row, 'Committee Head')
          const head = headName
            ? await tx.headOfSupervisorProfile.findFirst({ where: { headName } })
            : null
          const existing = await tx.pastorProfile.findUnique({ where: { userId: user.id } })
          if (!existing) result.profilesCreated += 1
          await tx.pastorProfile.upsert({
            where: { userId: user.id },
            update: { pastorName: displayName, headId: head?.id ?? null },
            create: { userId: user.id, pastorName: displayName, headId: head?.id ?? null },
          })
        }

        if (roles.includes('HOD')) {
          const supervisorName = cell(row, 'Supervising Pastor')
          const supervisor = supervisorName
            ? await tx.pastorProfile.findFirst({ where: { pastorName: supervisorName } })
            : null
          const teamNames = splitList(cell(row, 'Service Teams'))
          const teams = teamNames.length
            ? await tx.serviceTeam.findMany({ where: { name: { in: teamNames } }, select: { id: true } })
            : []
          const existing = await tx.hodProfile.findUnique({ where: { userId: user.id } })
          if (!existing) result.profilesCreated += 1
          await tx.hodProfile.upsert({
            where: { userId: user.id },
            update: {
              hodName: displayName,
              supervisorId: supervisor?.id ?? null,
              serviceTeams: { set: teams.map((team) => ({ id: team.id })) },
            },
            create: {
              userId: user.id,
              hodName: displayName,
              supervisorId: supervisor?.id ?? null,
              serviceTeams: { connect: teams.map((team) => ({ id: team.id })) },
            },
          })
        }
      })
    } catch (error) {
      result.skipped.push({
        username,
        reason: error instanceof Error ? error.message : 'Import failed for this row',
      })
    }
  }

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: 'USERS_CSV_IMPORTED',
      description: `Imported users CSV: ${result.usersCreated} created, ${result.usersUpdated} updated, ${result.skipped.length} skipped.`,
    },
  }).catch(() => null)

  return Response.json({ success: true, ...result })
}
