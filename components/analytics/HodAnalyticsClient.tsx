'use client'

import { Users, FileText, Star, TrendingUp } from 'lucide-react'
import TeamScoreBar from '@/components/charts/TeamScoreBar'
import ScoreTrendChart from '@/components/charts/ScoreTrendChart'
import type { TeamScorePoint } from '@/components/charts/TeamScoreBar'
import type { TrendPoint } from '@/components/charts/ScoreTrendChart'

const GRADE_LABEL: Record<string, string> = {
  FIVE: '5', FOUR: '4', THREE: '3', TWO: '2', ONE: '1', NOT_APPLICABLE: 'N/A',
}

const GRADE_CLS: Record<string, string> = {
  FIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  FOUR: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  THREE: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  TWO: 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400',
  ONE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500',
  NOT_APPLICABLE: 'bg-gray-50 text-gray-400 dark:bg-zinc-900 dark:text-gray-500',
}

export interface HodMemberGradeRow {
  memberId: string
  memberName: string
  teamName: string
  generalAttitude: string
  teamwork: string
  punctuality: string
  appearance: string
  attendance: string
  avgScore: number | null
}

interface Props {
  stats: {
    totalMembers: number
    submittedThisYear: number
    bestScore: number | null
    latestAvgScore: number | null
  }
  memberBarData: TeamScorePoint[]
  trendData: TrendPoint[]
  trendTeams: string[]
  gradeRows: HodMemberGradeRow[]
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-5">
      <h3 className="font-heading text-sbc-black dark:text-white tracking-widest text-base mb-4">
        {title}
      </h3>
      {children}
    </div>
  )
}

function GradeCell({ grade }: { grade: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-6 rounded text-[11px] font-medium ${GRADE_CLS[grade] ?? GRADE_CLS.NOT_APPLICABLE}`}
    >
      {GRADE_LABEL[grade] ?? grade}
    </span>
  )
}

export default function HodAnalyticsClient({
  stats, memberBarData, trendData, trendTeams, gradeRows,
}: Props) {
  const statCards = [
    { label: 'My Team Members', value: stats.totalMembers, sub: 'Active members', color: 'border-sbc-red', icon: <Users size={30} className="text-gray-200 dark:text-zinc-700" /> },
    { label: 'Reports Submitted', value: stats.submittedThisYear, sub: 'This year', color: 'border-green-500', icon: <FileText size={30} className="text-gray-200 dark:text-zinc-700" /> },
    { label: 'Best Score', value: stats.bestScore != null ? stats.bestScore.toFixed(2) : '—', sub: 'Highest monthly avg', color: 'border-amber-400', icon: <Star size={30} className="text-gray-200 dark:text-zinc-700" /> },
    { label: 'Latest Avg Score', value: stats.latestAvgScore != null ? stats.latestAvgScore.toFixed(2) : '—', sub: 'Most recent report', color: 'border-blue-500', icon: <TrendingUp size={30} className="text-gray-200 dark:text-zinc-700" /> },
  ]

  return (
    <div className="space-y-5">
      {/* Section 1 — Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className={`bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm border-b-4 ${card.color}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-widest font-medium">{card.label}</p>
                <p className="font-heading text-3xl text-sbc-black dark:text-white mt-1 leading-none">{card.value}</p>
                <p className="text-gray-400 text-[11px] mt-1.5">{card.sub}</p>
              </div>
              <div className="shrink-0 mt-1">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Section 2 — Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="MEMBER SCORES — CURRENT MONTH">
          <TeamScoreBar data={memberBarData} height={270} memberMode />
        </ChartCard>
        <ChartCard title="MONTHLY SCORE TREND — 12 MONTHS">
          <ScoreTrendChart data={trendData} teams={trendTeams} height={270} />
        </ChartCard>
      </div>

      {/* Section 3 — Grade Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-sbc-grey dark:border-white/10">
          <h3 className="font-heading text-sbc-black dark:text-white tracking-widest text-base">
            MEMBER PERFORMANCE — LATEST REPORT
          </h3>
        </div>
        {gradeRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">No grade data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-sbc-grey dark:border-white/10">
                  {['Name', 'Team', 'Gen. Attitude', 'Teamwork', 'Punctuality', 'Appearance', 'Attendance', 'Avg'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradeRows.map(row => (
                  <tr key={row.memberId} className="border-b border-sbc-grey/50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5">
                    <td className="px-3 py-2 font-medium text-sbc-black dark:text-white whitespace-nowrap">{row.memberName}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{row.teamName}</td>
                    <td className="px-3 py-2"><GradeCell grade={row.generalAttitude} /></td>
                    <td className="px-3 py-2"><GradeCell grade={row.teamwork} /></td>
                    <td className="px-3 py-2"><GradeCell grade={row.punctuality} /></td>
                    <td className="px-3 py-2"><GradeCell grade={row.appearance} /></td>
                    <td className="px-3 py-2"><GradeCell grade={row.attendance} /></td>
                    <td className="px-3 py-2 font-medium text-sbc-black dark:text-white">
                      {row.avgScore != null ? row.avgScore.toFixed(2) : '—'}
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
