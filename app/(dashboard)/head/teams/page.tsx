import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

export default async function HeadTeamsPage() {
  const session = await auth()
  const roles = session?.user?.roles ?? []
  if (!roles.includes('HEAD_OF_SUPERVISOR') && !roles.includes('PASTOR')) redirect('/dashboard')

  const teams = await prisma.serviceTeam.findMany({
    orderBy: { name: 'asc' },
    include: {
      hod: { select: { hodName: true } },
      pastor: { select: { pastorName: true } },
      members: { select: { id: true } },
    },
  })

  const activeCount = teams.filter((t) => t.isActive).length

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-sbc-grey dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-sbc-black dark:text-white text-xl tracking-widest">
              ALL SERVICE TEAMS
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeCount} active · {teams.length - activeCount} inactive
            </p>
          </div>
          <span className="text-2xl font-heading text-sbc-black dark:text-white">{teams.length}</span>
        </div>

        {teams.length === 0 ? (
          <div className="px-5 py-16 text-center text-gray-400 text-sm">
            No service teams found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Team</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">HOSTs</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium hidden md:table-cell">
                    Supervising Pastor
                  </th>
                  <th className="text-center px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Members</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-5 py-3 text-sbc-black dark:text-white font-medium">
                      {team.name}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                      {team.hod?.hodName ?? <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      {team.pastor?.pastorName ?? <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-500 dark:text-gray-400">
                      {team.members.length}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        team.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {team.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
