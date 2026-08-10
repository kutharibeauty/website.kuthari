import { ProductDetailSkeleton } from '@/components/ui/Skeleton'

/** Streamed instantly while a product page fetches server-side. */
export default function ProductLoading() {
  return <ProductDetailSkeleton />
}
