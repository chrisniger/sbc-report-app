'use client'

import { Users, FileText, Star, ClipboardCheck } from 'lucide-react'
import TeamScoreBar from '@/components/charts/TeamScoreBar'
import SubmissionPie from '@/components/charts/SubmissionPie'
import ScoreTrendChart from '@/components/charts/ScoreTrendChart'
import MemberScoreTable from '@/components/charts/MemberScoreTable'
import type { TeamScorePoint } from '@/components/charts/TeamScoreBar'
import type { StatusSlice } from '@/components/charts/SubmissionPie'
import type { TrendPoint } from '@/components/charts/ScoreTrendChart'
import type { MemberRow } from '@/components/charts/MemberScoreTable'

interface Props {
  stats: {
    myTeamsCount: number
    submittedThisMonth: number
    averageScore: number | null
    pendingReviews: number
  }
  teamScores: TeamScorePoint[]
  statusDistribution: StatusSlice[]
  trendData: TrendPoint[]
  trendTeams: string[]
  topMembers: MemberRow[]
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

export default function PastorAnalyticsClient({
  stats, teamScores, statusDistribution, trendData, trendTeams, topMembers,
}: Props) {
  const statCards = [
    { label: 'My Teams', value: stats.myTeamsCount, sub: 'Assigned teams', color: 'border-sbc-red', icon: <Users size={30} className="text-gray-200 dark:text-zinc-700" /> },
    { label: 'Submitted This Month', value: stats.submittedThisMonth, sub: 'Reports submitted', color: 'border-green-500', icon: <FileText size={30} className="text-gray-200 dark:text-zinc-700" /> },
    { label: 'Avg Score', value: stats.averageScore != null ? stats.averageScore.toFixed(2) : '—', sub: 'Across my teams', color: 'border-amber-400', icon: <Star size={30} className="text-gray-200 dark:text-zinc-700" /> },
    { label: 'Pending Reviews', value: stats.pendingReviews, sub: 'Awaiting review', color: 'border-blue-500', icon: <ClipboardCheck size={30} className="text-gray-200 dark:text-zinc-700" /> },
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
        <ChartCard title="TEAM AVERAGE SCORES — CURRENT MONTH">
          <TeamScoreBar data={teamScores} height={270} />
        </ChartCard>
        <ChartCard title="SUBMISSION STATUS — MY TEAMS">
          <SubmissionPie data={statusDistribution} height={270} />
        </ChartCard>
      </div>

      {/* Section 3 — Trend + Members */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="SCORE TREND — 6 MONTHS">
          <ScoreTrendChart data={trendData} teams={trendTeams} height={270} />
        </ChartCard>
        <ChartCard title="TOP MEMBERS — MY TEAMS">
          <MemberScoreTable initialData={topMembers} showFilter />
        </ChartCard>
      </div>
    </div>
  )
}
