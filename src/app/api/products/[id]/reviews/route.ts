import { createClient, createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ProductReview } from '@/types/database.types'
import type { AuthMetadata } from '@/types'
import { revalidateTag } from 'next/cache'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const isAdmin = req.nextUrl.searchParams.get('admin') === 'true'

  if (isAdmin) {
    const { userId, sessionClaims } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
    if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('reviews')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
    if (error?.code === '42P01') return NextResponse.json([])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []) as unknown as ProductReview[])
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: product_id } = await params

  // Require authentication
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in to leave a review' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id
  if (!profileId) return NextResponse.json({ error: 'Profile not configured' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { rating, body: reviewBody } = body as {
    rating?: unknown
    body?: unknown
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 })
  }

  // Server-side client throughout: customers have no write access to reviews
  // (RLS + grants are read-only), so the insert happens here, after the checks.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  // Verified purchase check: the user must have a delivered order containing
  // this product. The user_id filter scopes it to this customer.
  const { data: purchaseCheck } = await db
    .from('orders')
    .select('id')
    .eq('user_id', profileId)
    .eq('status', 'delivered')
    .filter('items', 'cs', JSON.stringify([{ product_id }]))
    .limit(1)
    .maybeSingle()

  if (!purchaseCheck) {
    return NextResponse.json(
      { error: 'You can only review products you have purchased and received' },
      { status: 403 },
    )
  }

  // One review per customer per product.
  const { data: existing } = await db
    .from('reviews').select('id').eq('user_id', profileId).eq('product_id', product_id).limit(1).maybeSingle()
  if (existing) return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 409 })

  // Shown as "First L." on the store.
  const { data: profile } = await db.from('profiles').select('name').eq('id', profileId).maybeSingle()
  const parts = String((profile as { name?: string } | null)?.name ?? '').trim().split(/\s+/).filter(Boolean)
  const reviewerName = parts.length ? (parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]) : 'Verified buyer'

  const text = typeof reviewBody === 'string' ? reviewBody.trim().slice(0, 1000) : ''

  const { data, error } = await db
    .from('reviews')
    .insert({
      product_id,
      user_id: profileId,
      order_id: (purchaseCheck as { id: string }).id,
      reviewer_name: reviewerName,
      rating: Math.round(rating),
      body: text || null,
      is_verified_purchase: true,
      // Every review waits for the shop to approve it (Admin → Reviews).
      is_approved: false,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Could not save your review' }, { status: 500 })
  revalidateTag('admin-badges', { expire: 0 })
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 })
}
