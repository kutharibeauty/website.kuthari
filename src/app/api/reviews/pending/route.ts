import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import type { OrderItem } from '@/types/database.types'

export interface PendingReviewProduct {
  id: string
  name: string
  image: string | null
}

/**
 * GET /api/reviews/pending
 *
 * Products the signed-in customer has RECEIVED (a delivered order) but not yet
 * reviewed. Drives the review gate that appears when they open the site.
 *
 * Mirrors the rule the review POST enforces — delivered orders only — so the
 * gate can never ask for a review the API would then reject, which would trap
 * the customer behind a popup they cannot satisfy.
 *
 * Always resolves to a list (never an error) — a failure here must not break
 * the storefront for everyone; it just means no gate this time.
 */
export async function GET() {
  const empty = NextResponse.json({ products: [] as PendingReviewProduct[] })

  try {
    const { userId, sessionClaims } = await auth()
    if (!userId) return empty

    const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
    const profileId = meta?.supabase_profile_id
    if (!profileId) return empty

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // select('*') on purpose — the live schema has drifted, and naming a column
    // that doesn't exist fails the WHOLE PostgREST query.
    const { data: orders } = await db
      .from('orders')
      .select('*')
      .eq('user_id', profileId)
      .eq('status', 'delivered')

    const delivered = (orders ?? []) as Array<{ items: OrderItem[] | null }>
    if (!delivered.length) return empty

    const purchased = new Set<string>()
    for (const o of delivered) {
      for (const i of o.items ?? []) {
        if (i?.product_id) purchased.add(i.product_id)
      }
    }
    if (!purchased.size) return empty

    // Anything they've already reviewed drops out — including reviews still
    // awaiting approval, or they'd be asked to review the same product twice.
    const { data: reviews, error: reviewsErr } = await db
      .from('reviews')
      .select('*')
      .eq('user_id', profileId)

    // 42P01 = reviews table missing. Treat as "nothing reviewed yet".
    if (reviewsErr && reviewsErr.code !== '42P01') return empty
    for (const r of (reviews ?? []) as Array<{ product_id: string }>) {
      purchased.delete(r.product_id)
    }
    if (!purchased.size) return empty

    const { data: products } = await db
      .from('products')
      .select('*')
      .in('id', [...purchased])
      .eq('is_active', true)

    const list: PendingReviewProduct[] = ((products ?? []) as Array<{
      id: string; name: string; images: string[] | null
    }>).map((p) => ({ id: p.id, name: p.name, image: p.images?.[0] ?? null }))

    return NextResponse.json({ products: list })
  } catch (e) {
    console.error('[reviews/pending] failed:', e)
    return empty
  }
}
