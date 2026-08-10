import { Skeleton, StatCardsSkeleton, TableSkeleton } from '@/components/ui/Skeleton'

/**
 * Fallback loading UI for the whole admin dashboard.
 *
 * Nested under (dashboard)/layout.tsx, so it covers EVERY admin page that
 * doesn't ship its own loading.tsx — one file instead of ~20. Most admin pages
 * are a header + list/table, so this shape fits them all closely enough.
 */
export default function AdminLoading() {
  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-table-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>

      <StatCardsSkeleton count={4} />
      <TableSkeleton rows={8} cols={6} />
    </div>
  )
}
