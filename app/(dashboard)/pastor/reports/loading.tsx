import { SkeletonTable } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm px-5 py-4 h-16 animate-pulse" />
      <SkeletonTable rows={6} cols={7} />
    </div>
  )
}
