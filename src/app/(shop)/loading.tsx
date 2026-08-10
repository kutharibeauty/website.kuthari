import { Skeleton, CategoryStripSkeleton, ProductSectionSkeleton } from '@/components/ui/Skeleton'

/**
 * Home page loading UI. Also acts as the fallback for any shop route that
 * doesn't ship its own loading.tsx (every current one does).
 */
export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Hero banner */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <Skeleton className="w-full h-40 md:h-64 rounded-2xl" />
      </div>

      {/* Promo cards */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      {/* Shop by category */}
      <section className="pt-2">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-end justify-between mb-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3 w-16" />
        </div>
        <CategoryStripSkeleton count={8} />
      </section>

      {/* Product rows */}
      <ProductSectionSkeleton count={5} />
      <ProductSectionSkeleton count={5} />
    </div>
  )
}
