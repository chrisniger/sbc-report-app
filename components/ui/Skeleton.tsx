export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse ${className}`}
    />
  )
}

export function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-5 space-y-3">
      <SkeletonLine className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine
          key={i}
          className={`h-3 ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-5/6' : 'w-4/6'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-sbc-grey dark:border-white/10">
        <SkeletonLine className="h-4 w-40" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-sbc-grey dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/40">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-5 py-3">
                  <SkeletonLine className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, row) => (
              <tr key={row} className="border-b border-sbc-grey/50 dark:border-white/5">
                {Array.from({ length: cols }).map((_, col) => (
                  <td key={col} className="px-5 py-3.5">
                    <SkeletonLine className="h-3 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
