import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * Base skeleton block. Brand-tinted (subtle brown) so it reads clearly on both
 * the white cards and the cream page background, and pulses to signal loading.
 * Compose these into page-shaped skeletons rather than showing a bare spinner —
 * a layout-matched placeholder makes loads feel faster and avoids layout shift
 * when the real content swaps in.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-primary/[0.07]', className)}
    />
  )
}

// ── Product ────────────────────────────────────────────────────────────────

/** Single product card placeholder. `full` stretches it to fill a grid cell. */
export function ProductCardSkeleton({ full = false }: { full?: boolean }) {
  return (
    <div className={full ? 'w-full' : 'w-40 md:w-48 flex-shrink-0'}>
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="mt-2 space-y-1.5 px-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-7 w-full rounded-lg" />
      </div>
    </div>
  )
}

/** Responsive product grid placeholder — mirrors ProductGrid's column counts. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} full />
      ))}
    </div>
  )
}

/** A home "ProductSection": title row + a horizontal strip of product cards. */
export function ProductSectionSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex gap-3 md:gap-4 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// Sizes mirror CategoryStrip so the layout doesn't jump when the real strip loads.
export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-2.5 flex-shrink-0 w-[92px] sm:w-[112px]">
      <Skeleton className="w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] rounded-full" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

/** Blinkit-style horizontal category strip placeholder. */
export function CategoryStripSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-5">
      <div className="flex gap-4 sm:gap-6 overflow-hidden pb-3">
        {Array.from({ length: count }).map((_, i) => (
          <CategorySkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// ── Orders ───────────────────────────────────────────────────────────────────

/** One order card placeholder — matches the My Orders list card layout. */
export function OrderCardSkeleton() {
  return (
    <div className="bg-surface-card border-2 border-table-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="h-px bg-table-border mb-4" />
      <div className="mb-4 space-y-2">
        <Skeleton className="h-2.5 w-12" />
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-10" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

export function OrdersListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ── Addresses ────────────────────────────────────────────────────────────────

/** One saved-address card placeholder (checkout + address book). */
export function AddressCardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-table-border bg-surface-card p-4 space-y-2">
      <Skeleton className="h-4 w-16 rounded-lg" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

// ── Generic building blocks ──────────────────────────────────────────────────

/** A rows × cols table placeholder (admin lists). */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl border-2 border-table-border bg-surface-card overflow-hidden">
      {/* Header band */}
      <div className="flex gap-4 px-5 py-4 bg-primary">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 bg-white/20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-4 border-b border-table-border last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Stat tiles row (dashboard/analytics). */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border-2 border-table-border bg-surface-card p-5 space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  )
}

/** Stacked form fields inside a card. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="rounded-2xl border-2 border-table-border bg-surface-card p-6 space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-12 w-40 rounded-xl ml-auto" />
    </div>
  )
}

/** Simple stacked card list (wishlist, saved lists, addresses). */
export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border-2 border-table-border bg-surface-card p-4 flex gap-4 items-center">
          <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

/** Dark hero strip used at the top of most shop pages. */
export function HeroStripSkeleton() {
  return (
    <div className="relative overflow-hidden bg-primary border-b-2 border-primary mb-6">
      <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
      <div className="relative z-10 px-4 max-w-4xl mx-auto py-8 md:py-10 space-y-2">
        <Skeleton className="h-2.5 w-16 bg-white/20" />
        <Skeleton className="h-8 w-48 bg-white/20" />
        <Skeleton className="h-3 w-28 bg-white/20" />
      </div>
    </div>
  )
}

// ── Product detail ───────────────────────────────────────────────────────────

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Skeleton className="h-4 w-48 mb-6" />
      <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
        {/* Gallery */}
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-16 h-16 rounded-xl" />
            ))}
          </div>
        </div>
        {/* Info */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-40" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl mt-4" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
