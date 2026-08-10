import { HeroStripSkeleton, CardListSkeleton } from '@/components/ui/Skeleton'

export default function ShoppingListLoading() {
  return (
    <div className="min-h-screen">
      <HeroStripSkeleton />
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <CardListSkeleton count={5} />
      </div>
    </div>
  )
}
