import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

/**
 * POST /api/coupons/validate — check a coupon FOR THE CURRENT CUSTOMER.
 *
 * The cart used to validate against the public coupon list, which can only see
 * the global cap. The per-customer cap (max_uses_per_customer) depends on who is
 * asking, so a customer who had already used a coupon could still apply it, see
 * the discount, and only be rejected when placing the order. This runs the same
 * rules the order route runs, so the cart fails fast and honestly.
 *
 * Signed out, the per-customer check is skipped (there's no one to count) — the
 * order route still enforces it once they sign in to check out, so it can never
 * be bypassed by applying while logged out.
 */
export async function POST(req: NextRequest) {
  let body: { code?: string; subtotal?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }

  const code = (body.code ?? '').trim()
  const subtotal = Number(body.subtotal) || 0
  if (!code) return NextResponse.json({ ok: false, error: 'Enter a coupon code' }, { status: 400 })

  const supabase = createAdminClient()
  // select('*') — the live table has drifted; naming a missing column would fail
  // the whole query.
  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code)
    .maybeSingle()

  const c = coupon as null | {
    id: string; code: string; description: string | null; description_or: string | null
    discount_type: 'percentage' | 'flat'; discount_value: number
    min_order_value: number | null; max_discount: number | null
    max_uses: number | null; max_uses_per_customer?: number | null
    uses_count: number | null; valid_until: string | null; is_active: boolean
  }

  if (!c || !c.is_active) {
    return NextResponse.json({ ok: false, error: 'Invalid coupon code' }, { status: 400 })
  }
  if (c.valid_until != null && new Date(c.valid_until) < new Date()) {
    return NextResponse.json({ ok: false, error: 'This coupon has expired' }, { status: 400 })
  }
  if (c.max_uses != null && (c.uses_count ?? 0) >= c.max_uses) {
    return NextResponse.json({ ok: false, error: 'This coupon is no longer available' }, { status: 400 })
  }
  if (c.min_order_value != null && subtotal < c.min_order_value) {
    return NextResponse.json(
      { ok: false, error: `Min. order ₹${c.min_order_value} required for this coupon` },
      { status: 400 },
    )
  }

  // Per-customer cap — only meaningful for a signed-in customer.
  const { userId, sessionClaims } = await auth()
  const profileId = (sessionClaims?.publicMetadata as AuthMetadata | undefined)?.supabase_profile_id
  if (userId && profileId && c.max_uses_per_customer != null && c.max_uses_per_customer > 0) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileId)
      .ilike('coupon_code', c.code)

    if ((count ?? 0) >= c.max_uses_per_customer) {
      return NextResponse.json(
        {
          ok: false,
          error: c.max_uses_per_customer === 1
            ? 'You have already used this coupon.'
            : `You can only use this coupon ${c.max_uses_per_customer} times.`,
        },
        { status: 400 },
      )
    }
  }

  // Shape mirrors the public coupon list the cart already renders.
  return NextResponse.json({
    ok: true,
    coupon: {
      id: c.id,
      code: c.code,
      description: c.description,
      description_or: c.description_or,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      min_order_value: c.min_order_value,
      max_discount: c.max_discount,
      max_uses: c.max_uses,
      uses_count: c.uses_count,
      valid_until: c.valid_until,
    },
  })
}
