import { SkeletonCard } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm animate-pulse">
            <div className="h-8 w-12 bg-zinc-200 dark:bg-zinc-700 rounded mx-auto mb-2" />
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} rows={6} />
        ))}
      </div>
    </div>
  )
}
