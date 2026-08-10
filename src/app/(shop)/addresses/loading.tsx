import { Skeleton, HeroStripSkeleton, AddressCardSkeleton } from '@/components/ui/Skeleton'

export default function AddressesLoading() {
  return (
    <div className="min-h-screen bg-background">
      <HeroStripSkeleton />
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <Skeleton className="h-12 w-full rounded-xl mb-5" />
        <div className="flex flex-col gap-3">
          <AddressCardSkeleton />
          <AddressCardSkeleton />
        </div>
      </div>
    </div>
  )
}
