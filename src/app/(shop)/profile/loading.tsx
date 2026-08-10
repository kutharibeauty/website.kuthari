import { HeroStripSkeleton, FormSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen">
      <HeroStripSkeleton />
      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">
        {/* Refer & Earn card */}
        <Skeleton className="h-40 w-full rounded-2xl" />
        <FormSkeleton fields={3} />
      </div>
    </div>
  )
}
