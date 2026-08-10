import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton'

/** Streamed instantly while search results fetch server-side. */
export default function SearchLoading() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branded sidebar */}
      <aside className="lg:w-64 xl:w-72 flex-shrink-0 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
        <div className="relative z-10 p-6 space-y-6">
          <Skeleton className="h-10 w-32 bg-white/20" />
          <div className="space-y-2 border-b border-white/10 pb-6">
            <Skeleton className="h-3 w-20 bg-white/20" />
            <Skeleton className="h-6 w-40 bg-white/20" />
          </div>
          <div className="hidden lg:flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg bg-white/15" />
            ))}
          </div>
        </div>
      </aside>

      {/* Right product grid */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        <ProductGridSkeleton count={12} />
      </div>
    </div>
  )
}
