import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const phone = new URL(request.url).searchParams.get('phone')?.trim()
  if (!phone) {
    return Response.json({ error: 'Phone required' }, { status: 400 })
  }

  const member = await prisma.serviceTeamMember.findUnique({
    where: { phone },
    include: {
      teamAssignments: {
        include: { team: { select: { id: true, name: true } } },
      },
    },
  })

  if (!member) {
    return Response.json({ exists: false })
  }

  return Response.json({
    exists: true,
    member: {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      fullName: member.fullName,
      phone: member.phone,
      homeLocation: member.homeLocation,
      email: member.email,
      teams: member.teamAssignments.map((a) => a.team),
    },
  })
}
