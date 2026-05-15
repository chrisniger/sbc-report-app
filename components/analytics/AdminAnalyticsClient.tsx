'use client'

import { BarChart2, FileText, Users, Star, TrendingUp } from 'lucide-react'
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
    totalReports: number
    reportsThisMonth: number
    totalMembers: number
    averageScore: number | null
    submissionRate: number
  }
  teamScores: TeamScorePoint[]
  statusDistribution: StatusSlice[]
  trendData: TrendPoint[]
  trendTeams: string[]
  topMembers: MemberRow[]
}

const STAT_CARDS = [
  { key: 'totalReports', label: 'Total Reports', sub: 'All time', color: 'border-sbc-red', icon: <FileText size={32} className="text-gray-200 dark:text-zinc-700" /> },
  { key: 'reportsThisMonth', label: 'Reports This Month', sub: 'Submitted', color: 'border-blue-500', icon: <BarChart2 size={32} className="text-gray-200 dark:text-zinc-700" /> },
  { key: 'totalMembers', label: 'Total Members', sub: 'Active members', color: 'border-green-500', icon: <Users size={32} className="text-gray-200 dark:text-zinc-700" /> },
  { key: 'averageScore', label: 'Avg Score', sub: 'Current month', color: 'border-amber-400', icon: <Star size={32} className="text-gray-200 dark:text-zinc-700" /> },
  { key: 'submissionRate', label: 'Submission Rate', sub: 'Teams submitted %', color: 'border-purple-500', icon: <TrendingUp size={32} className="text-gray-200 dark:text-zinc-700" /> },
] as const

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

export default function AdminAnalyticsClient({
  stats, teamScores, statusDistribution, trendData, trendTeams, topMembers,
}: Props) {
  const statValues: Record<string, string | number> = {
    totalReports: stats.totalReports,
    reportsThisMonth: stats.reportsThisMonth,
    totalMembers: stats.totalMembers,
    averageScore: stats.averageScore != null ? stats.averageScore.toFixed(2) : '—',
    submissionRate: `${stats.submissionRate}%`,
  }

  return (
    <div className="space-y-5">
      {/* Section 1 — Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {STAT_CARDS.map(card => (
          <div
            key={card.key}
            className={`bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm border-b-4 ${card.color}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-widest font-medium leading-tight">
                  {card.label}
                </p>
                <p className="font-heading text-3xl text-sbc-black dark:text-white mt-1 leading-none">
                  {statValues[card.key]}
                </p>
                <p className="text-gray-400 text-[11px] mt-1.5">{card.sub}</p>
              </div>
              <div className="shrink-0 mt-1">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Section 2 — Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="TEAM AVERAGE SCORES — CURRENT MONTH">
          <TeamScoreBar data={teamScores} height={270} />
        </ChartCard>
        <ChartCard title="SUBMISSION STATUS DISTRIBUTION">
          <SubmissionPie data={statusDistribution} height={270} />
        </ChartCard>
      </div>

      {/* Section 3 — Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="MONTHLY SCORE TREND — 12 MONTHS">
          <ScoreTrendChart data={trendData} teams={trendTeams} height={270} />
        </ChartCard>
        <ChartCard title="TOP PERFORMING MEMBERS">
          <MemberScoreTable initialData={topMembers} showFilter />
        </ChartCard>
      </div>
    </div>
  )
}
