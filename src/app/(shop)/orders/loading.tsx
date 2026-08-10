import { Skeleton, OrdersListSkeleton } from '@/components/ui/Skeleton'

/** Streamed instantly while the orders list fetches server-side. */
export default function OrdersLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero strip (matches the real page) */}
      <div className="relative overflow-hidden bg-primary border-b-2 border-primary mb-6">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
        <div className="relative z-10 px-4 max-w-4xl mx-auto py-8 md:py-10 space-y-2">
          <Skeleton className="h-2.5 w-16 bg-white/20" />
          <Skeleton className="h-8 w-40 bg-white/20" />
          <Skeleton className="h-3 w-24 bg-white/20" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-10">
        <OrdersListSkeleton count={4} />
      </div>
    </div>
  )
}
