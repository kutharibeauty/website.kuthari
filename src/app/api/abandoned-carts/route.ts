import { createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

/**
 * POST /api/abandoned-carts — record/refresh the signed-in customer's cart.
 *
 * `abandoned_carts` is a service-role-only table (no anon/authenticated grant),
 * so this MUST use the admin client — and it has no unique constraint on
 * user_id, so we do a manual upsert (find existing → update, else insert)
 * instead of `onConflict`.
 */
export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? userId

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const items = (body as { items?: unknown }).items as
    | { price?: number; quantity?: number }[]
    | undefined
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 })
  }

  const totalValue = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0)
  const itemCount = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  try {
    // Stamp the customer's phone so admins can follow up.
    const { data: profile } = await db.from('profiles').select('phone').eq('id', profileId).maybeSingle()

    const payload = {
      phone: profile?.phone ?? null,
      cart_items: items,
      total_value: totalValue,
      item_count: itemCount,
      last_activity: new Date().toISOString(),
      is_recovered: false,
    }

    const { data: existingRows } = await db
      .from('abandoned_carts')
      .select('id')
      .eq('user_id', profileId)
      .order('last_activity', { ascending: false })
      .limit(1)
    const existing = (existingRows as { id: string }[] | null)?.[0]

    if (existing) {
      await db.from('abandoned_carts').update(payload).eq('id', existing.id)
    } else {
      await db.from('abandoned_carts').insert({ user_id: profileId, ...payload })
    }
    return NextResponse.json({ ok: true })
  } catch {
    // Best-effort tracking — never surface an error to the shopping flow.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({})
}
