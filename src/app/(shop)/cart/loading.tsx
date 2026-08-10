import { Skeleton, HeroStripSkeleton, CardListSkeleton } from '@/components/ui/Skeleton'

export default function CartLoading() {
  return (
    <div className="min-h-screen">
      <HeroStripSkeleton />
      <div className="max-w-5xl mx-auto px-4 pb-36 lg:pb-10 lg:flex lg:gap-6">
        <div className="lg:flex-1 flex flex-col gap-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <CardListSkeleton count={3} />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="lg:w-72 mt-4 lg:mt-0">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
