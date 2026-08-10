import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import ReviewsClient from './ReviewsClient'
import type { ProductReview } from '@/types/database.types'

export const metadata: Metadata = { title: 'Reviews | Kuthari Admin' }
export const revalidate = 0

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const [productRes, reviewsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('products').select('id, name').eq('id', id).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('reviews')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!productRes.data) notFound()

  const tableExists = !reviewsRes.error || reviewsRes.error?.code !== '42P01'
  const reviews = tableExists ? ((reviewsRes.data ?? []) as ProductReview[]) : []
  const product = productRes.data as { id: string; name: string }

  return (
    <ReviewsClient
      productId={id}
      productName={product.name}
      initialReviews={reviews}
      tableExists={tableExists}
    />
  )
}
