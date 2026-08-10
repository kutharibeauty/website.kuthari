import { Skeleton } from '@/components/ui/Skeleton'

/** Streamed instantly while a single order fetches server-side. */
export default function OrderDetailLoading() {
  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back link + header */}
      <Skeleton className="h-4 w-24" />
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      {/* Timeline */}
      <div className="bg-surface-card border-2 border-table-border rounded-2xl p-5 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Item rows */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-card border-2 border-table-border rounded-2xl p-4 flex gap-4 items-center">
            <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-surface-card border-2 border-table-border rounded-2xl p-5 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-6 w-32" />
      </div>
    </div>
  )
}
