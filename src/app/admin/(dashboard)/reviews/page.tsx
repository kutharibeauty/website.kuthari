import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import ReviewsQueueClient, { type QueueReview } from './ReviewsQueueClient'

export const metadata: Metadata = { title: 'Reviews | Kuthari Admin' }
export const dynamic = 'force-dynamic'

/** Every product's reviews in one place, newest first, waiting ones on top. */
export default async function ReviewsQueuePage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = 'pending' } = await searchParams
  const tab = show === 'approved' || show === 'all' ? show : 'pending'
  const db = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any)
    .from('reviews')
    .select('id, product_id, reviewer_name, rating, title, body, is_verified_purchase, is_admin_added, is_approved, created_at, products(name, slug, images)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (tab === 'pending') q = q.eq('is_approved', false)
  if (tab === 'approved') q = q.eq('is_approved', true)

  const [{ data }, pending, approved] = await Promise.all([
    q,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', true),
  ])

  return (
    <ReviewsQueueClient
      tab={tab}
      reviews={(data ?? []) as QueueReview[]}
      counts={{ pending: pending.count ?? 0, approved: approved.count ?? 0 }}
    />
  )
}
