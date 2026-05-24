// prisma/seed.ts
import 'dotenv/config'

import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

const SERVICE_TEAMS = [
  '360 DEGREES',
  'USHERING',
  'EVANGELISM',
  'FOLLOW UP',
  'GUEST SERVICES',
  'TESTIMONY TEAM',
  'SCHOOL OF LOCAL CHURCH (SOLC)',
  'GREETERS',
  'JOLLY JOLLY',
  'SOUND',
  'VIDEO',
  'AUDIO',
  'SALES AND MARKETING',
  "CHILDREN'S CHURCH (CHURCH IN ANTIOCH)",
  'SERVICE COORDINATORS',
  'EKKLESIA TEENS CHURCH',
  'PROTOCOL',
  'SECURITY',
  'MAINTENANCE',
  'MEDICAL TEAM',
  'LIGHT',
  'PHOTOGRAPHY',
  'PRAYER',
  'CREATIVE DESIGN',
  'INFORMATION AND COMMUNICATION',
  'SUMMIT THEATRE AND FILMS',
  'TRAFFIC',
  'KINGDOM CARE',
]

async function main() {
  console.log('🌱 Starting seed...')

  // ─────────────────────────────────────────
  // 1. Create Admin User
  // ─────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@SBC2026', 10)

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@thesummitbc.org',
      phone: '08000000000',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      roles: [UserRole.ADMIN],
      isActive: true,
      mustChangePassword: false,
    },
  })
  console.log('✅ Admin user created:', adminUser.username)

  // ─────────────────────────────────────────
  // 2. Create Head of Supervisor User
  // ─────────────────────────────────────────
  const headPasswordHash = await bcrypt.hash('Head@SBC2026', 10)

  const headUser = await prisma.user.upsert({
    where: { username: 'pst.remisaliu' },
    update: {},
    create: {
      username: 'pst.remisaliu',
      email: 'osaliu@noun.edu.ng',
      phone: '08011111111',
      passwordHash: headPasswordHash,
      firstName: 'Remi',
      lastName: 'Saliu',
      roles: [UserRole.HEAD_OF_SUPERVISOR],
      isActive: true,
      mustChangePassword: false,
    },
  })

  const headProfile = await prisma.headOfSupervisorProfile.upsert({
    where: { userId: headUser.id },
    update: {},
    create: {
      userId: headUser.id,
      headName: 'Pst. Remi Saliu',
    },
  })
  console.log('✅ Head of Supervisor created:', headUser.username)

  // ─────────────────────────────────────────
  // 2b. Create head.supervisor test account
  // ─────────────────────────────────────────
  const headSupPasswordHash = await bcrypt.hash('Head@SBC2026', 10)

  const headSupUser = await prisma.user.upsert({
    where: { username: 'head.supervisor' },
    update: {},
    create: {
      username: 'head.supervisor',
      passwordHash: headSupPasswordHash,
      firstName: 'Remi',
      lastName: 'Saliu',
      roles: [UserRole.HEAD_OF_SUPERVISOR],
      isActive: true,
      mustChangePassword: false,
    },
  })

  await prisma.headOfSupervisorProfile.upsert({
    where: { userId: headSupUser.id },
    update: {},
    create: {
      userId: headSupUser.id,
      headName: 'Remi Saliu',
    },
  })
  console.log('✅ Head of Supervisor (head.supervisor) created/verified')

  // ─────────────────────────────────────────
  // 3. Create Sample Supervisor Pastor Users
  // ─────────────────────────────────────────
  const pastors = [
    {
      username: 'pst.deleogunba',
      email: 'emmanuelekpo12@gmail.com',
      phone: '08022222221',
      firstName: 'Dele',
      lastName: 'Ogunba',
      pastorName: 'Pst. Dele Ogunba',
    },
    {
      username: 'pst.funmiodia',
      email: 'funmiodia@yahoo.com',
      phone: '08022222222',
      firstName: 'Funmi',
      lastName: 'Odia',
      pastorName: 'Pst. Funmi Odia',
    },
    {
      username: 'pst.remisaliu2',
      email: 'osaliu2@noun.edu.ng',
      phone: '08022222223',
      firstName: 'Remi',
      lastName: 'Saliu',
      pastorName: 'Pst. Remi Saliu',
    },
    {
      username: 'pst.andreaOgunba',
      email: 'snufflylovely@gmail.com',
      phone: '08022222224',
      firstName: 'Andrea',
      lastName: 'Ogunba',
      pastorName: 'Pst. Andrea Ogunba',
    },
  ]

  const pastorProfiles: Record<string, string> = {}

  for (const p of pastors) {
    const ph = await bcrypt.hash('Pastor@SBC2026', 10)
    const u = await prisma.user.upsert({
      where: { username: p.username },
      update: {},
      create: {
        username: p.username,
        email: p.email,
        phone: p.phone,
        passwordHash: ph,
        firstName: p.firstName,
        lastName: p.lastName,
        roles: [UserRole.SUPERVISOR_PASTOR],
        isActive: true,
        mustChangePassword: false,
      },
    })
    const pp = await prisma.pastorProfile.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        pastorName: p.pastorName,
        headId: headProfile.id,
      },
    })
    pastorProfiles[p.username] = pp.id
    console.log('✅ Pastor created:', p.username)
  }

  // ─────────────────────────────────────────
  // 4. Create Sample HOD Users
  // ─────────────────────────────────────────
  const hods = [
    {
      username: 'hod.greeters',
      email: 'greeters@thesummitbc.org',
      phone: '08033333331',
      firstName: 'Olufunmilayo',
      lastName: 'Odia',
      hodName: 'Pst. Funmi Odia',
      pastorUsername: 'pst.funmiodia',
    },
    {
      username: 'hod.protocol',
      email: 'protocol@thesummitbc.org',
      phone: '08033333332',
      firstName: 'Ngozi',
      lastName: 'Asielue',
      hodName: 'Ngozi Asielue',
      pastorUsername: 'pst.deleogunba',
    },
    {
      username: 'hod.audio',
      email: 'audio@thesummitbc.org',
      phone: '08033333333',
      firstName: 'John',
      lastName: 'Musa',
      hodName: 'John Musa',
      pastorUsername: 'pst.deleogunba',
    },
    {
      username: 'hod.evangelism',
      email: 'evangelism@thesummitbc.org',
      phone: '08033333334',
      firstName: 'Chioma',
      lastName: 'Ihuoma',
      hodName: 'Chioma Ihuoma Agbakwuru',
      pastorUsername: 'pst.funmiodia',
    },
    {
      username: 'hod.360',
      email: '360degrees@thesummitbc.org',
      phone: '08033333335',
      firstName: 'Emmanuel',
      lastName: 'Ekpo',
      hodName: 'Emmanuel Ekpo',
      pastorUsername: 'pst.andreaOgunba',
    },
  ]

  const hodProfileMap: Record<string, string> = {}

  for (const h of hods) {
    const ph = await bcrypt.hash('Hod@SBC2026', 10)
    const u = await prisma.user.upsert({
      where: { username: h.username },
      update: {},
      create: {
        username: h.username,
        email: h.email,
        phone: h.phone,
        passwordHash: ph,
        firstName: h.firstName,
        lastName: h.lastName,
        roles: [UserRole.HOD],
        isActive: true,
        mustChangePassword: false,
      },
    })
    const hp = await prisma.hodProfile.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        hodName: h.hodName,
        supervisorId: pastorProfiles[h.pastorUsername],
      },
    })
    hodProfileMap[h.username] = hp.id
    console.log('✅ HOD created:', h.username)
  }

  // ─────────────────────────────────────────
  // 5. Create All 28 Service Teams
  // ─────────────────────────────────────────

  // Map team names to HOD usernames
  const teamHodMap: Record<string, string> = {
    'GREETERS': 'hod.greeters',
    'PROTOCOL': 'hod.protocol',
    'AUDIO': 'hod.audio',
    'SOUND': 'hod.audio',
    'EVANGELISM': 'hod.evangelism',
    'FOLLOW UP': 'hod.evangelism',
    '360 DEGREES': 'hod.360',
  }

  // Map team names to Pastor usernames
  const teamPastorMap: Record<string, string> = {
    'GREETERS': 'pst.funmiodia',
    'INFORMATION AND COMMUNICATION': 'pst.funmiodia',
    'PROTOCOL': 'pst.deleogunba',
    'AUDIO': 'pst.deleogunba',
    'SOUND': 'pst.deleogunba',
    'EVANGELISM': 'pst.funmiodia',
    'FOLLOW UP': 'pst.funmiodia',
    '360 DEGREES': 'pst.andreaOgunba',
    'JOLLY JOLLY': 'pst.remisaliu2',
    'PRAYER': 'pst.remisaliu2',
    'TRAFFIC': 'pst.deleogunba',
    'SERVICE COORDINATORS': 'pst.deleogunba',
  }

  for (const teamName of SERVICE_TEAMS) {
    const hodUsername = teamHodMap[teamName]
    const pastorUsername = teamPastorMap[teamName]

    await prisma.serviceTeam.upsert({
      where: { name: teamName },
      update: {},
      create: {
        name: teamName,
        isActive: true,
        hodId: hodUsername ? hodProfileMap[hodUsername] : null,
        pastorId: pastorUsername ? pastorProfiles[pastorUsername] : null,
      },
    })
    console.log('✅ Service team created:', teamName)
  }

  // ─────────────────────────────────────────
  // 6. Default SMTP Settings
  // ─────────────────────────────────────────
  const existingSmtp = await prisma.smtpSettings.findFirst()
  if (!existingSmtp) {
    await prisma.smtpSettings.create({
      data: {
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        username: 'reports@summitdata.one',
        password: '',
        fromDisplay: 'SBC Reports <reports@summitdata.one>',
        updatedById: adminUser.id,
      },
    })
    console.log('✅ Default SMTP settings created')
  }

  // ─────────────────────────────────────────
  // 7. Default Notification Settings
  // ─────────────────────────────────────────
  const defaultNotifs = [
    { event: 'HOD_REPORT_SUBMITTED', recipientEmail: 'ugikenna@yahoo.com', recipientName: 'Admin' },
    { event: 'PASTOR_REVIEW_COMPLETED', recipientEmail: 'admin@thesummitbc.org', recipientName: 'Admin' },
    { event: 'HEAD_REVIEW_COMPLETED', recipientEmail: 'admin@thesummitbc.org', recipientName: 'Admin' },
  ]

  for (const n of defaultNotifs) {
    const exists = await prisma.notificationSetting.findFirst({
      where: { event: n.event, recipientEmail: n.recipientEmail },
    })
    if (!exists) {
      await prisma.notificationSetting.create({ data: n })
      console.log('✅ Notification setting created:', n.event)
    }
  }

  // ─────────────────────────────────────────
  // 8. Default Report Period (May 2026)
  // ─────────────────────────────────────────
  await prisma.reportPeriod.upsert({
    where: { month_year: { month: 5, year: 2026 } },
    update: {},
    create: {
      month: 5,
      year: 2026,
      deadline: new Date('2026-05-31T23:59:59Z'),
      isLocked: false,
      autoReminders: true,
    },
  })
  console.log('✅ Default report period created: May 2026')

  // ─────────────────────────────────────────
  // 9. Seed Activity Log
  // ─────────────────────────────────────────
  await prisma.activityLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_SEEDED',
      description: 'Database seeded with initial data — 28 service teams, users, SMTP and notification settings.',
      entityType: 'System',
      entityId: 'seed',
    },
  })
  console.log('✅ Activity log entry created')

  console.log('\n🎉 Seed complete!')
  console.log('─────────────────────────────────────')
  console.log('Login credentials:')
  console.log('  Admin    → username: admin          | password: Admin@SBC2026')
  console.log('  Head     → username: pst.remisaliu  | password: Head@SBC2026')
  console.log('  Pastors  → password: Pastor@SBC2026')
  console.log('  HODs     → password: Hod@SBC2026')
  console.log('─────────────────────────────────────')
  console.log('  All users can log in directly — no forced password change.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
