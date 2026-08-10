import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton'

/** Streamed instantly while a category + its products fetch server-side. */
export default function CategoryLoading() {
  return (
    <>
      {/* Category banner */}
      <section className="relative w-full h-[200px] md:h-[280px] bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none z-10" />
        <div className="absolute inset-0 z-20 flex flex-col justify-end px-5 md:px-10 lg:px-16 pb-7 md:pb-10 max-w-7xl mx-auto gap-3">
          <Skeleton className="h-6 w-24 rounded-full bg-white/20" />
          <Skeleton className="h-10 w-64 bg-white/20" />
        </div>
      </section>

      {/* Sort / filter bar */}
      <div className="bg-surface-container-low border-b border-outline-variant py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ProductGridSkeleton count={12} />
      </div>
    </>
  )
}
