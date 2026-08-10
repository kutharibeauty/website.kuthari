import { HeroStripSkeleton, ProductGridSkeleton } from '@/components/ui/Skeleton'

export default function WishlistLoading() {
  return (
    <div className="min-h-screen">
      <HeroStripSkeleton />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  )
}
