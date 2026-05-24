import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSupervisedPastorScope } from '@/lib/pastor-scope'

export default async function PastorTeamsPage() {
  const session = await auth()
  if (!session?.user?.roles?.includes('SUPERVISOR_PASTOR')) redirect('/dashboard')

  const scope = await getSupervisedPastorScope(session.user.id)
  if (!scope) redirect('/dashboard')

  const teams = await prisma.serviceTeam.findMany({
    where: {
      id: { in: scope.teamIds },
      hodId: { in: scope.hodIds },
    },
    orderBy: { name: 'asc' },
    include: {
      hod: { select: { hodName: true } },
      members: { select: { id: true } },
    },
  })

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-sbc-grey dark:border-white/10">
          <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">
            MY SERVICE TEAMS
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{teams.length} team{teams.length !== 1 ? 's' : ''} assigned to you</p>
        </div>

        {teams.length === 0 ? (
          <div className="px-5 py-16 text-center text-gray-400 text-sm">
            No service teams are assigned to you yet.
          </div>
        ) : (
          <div className="divide-y divide-sbc-grey/50 dark:divide-white/5">
            {teams.map((team) => (
              <div key={team.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sbc-black dark:text-white text-sm truncate">{team.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    HOSTs: {team.hod?.hodName ?? <span className="italic text-gray-400">Unassigned</span>}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-heading text-sbc-black dark:text-white">{team.members.length}</p>
                    <p className="text-[11px] text-gray-400">Members</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    team.isActive
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {team.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
