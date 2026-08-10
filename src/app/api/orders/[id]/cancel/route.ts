import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse, after } from 'next/server'
import type { AuthMetadata } from '@/types'
import { notifyOrderEvent } from '@/lib/resend/notify'
import { restoreStockForOrder } from '@/lib/orders/stock'

/**
 * POST /api/orders/[id]/cancel — customer-initiated cancellation.
 *
 * Rules (enforced server-side so they can't be bypassed from the client):
 *   • A customer may cancel their own order ONLY while it is still 'placed'
 *     (i.e. the admin hasn't confirmed it yet). Once confirmed/packed/etc. it
 *     can no longer be cancelled from the customer side.
 *   • A GST-invoice order (has a gstin) can NEVER be cancelled by the customer.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id
  if (!profileId) return NextResponse.json({ error: 'Profile not configured' }, { status: 400 })

  const { id } = await params
  const supabase = createAdminClient()

  // Scope the read to the caller's own order.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (supabase as any)
    .from('orders')
    .select('id, status, gstin')
    .eq('id', id)
    .eq('user_id', profileId)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (order.gstin) {
    return NextResponse.json(
      { error: 'GST invoice orders cannot be cancelled. Please contact us for any changes.' },
      { status: 409 },
    )
  }

  if (order.status !== 'placed') {
    return NextResponse.json(
      { error: 'This order has already been confirmed and can no longer be cancelled. Please contact us for help.' },
      { status: 409 },
    )
  }

  // Guard against a race: only flip 'placed' → 'cancelled'. If the admin confirmed
  // it between our read and write, this matches zero rows and we report the block.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (supabase as any)
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', profileId)
    .eq('status', 'placed')
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Could not cancel the order. Please try again.' }, { status: 500 })
  if (!updated) {
    return NextResponse.json(
      { error: 'This order has already been confirmed and can no longer be cancelled.' },
      { status: 409 },
    )
  }

  // `after()`, not a bare `void`: on serverless a dropped promise here means the
  // customer's stock is never given back and the product stays falsely sold out.
  after(() => restoreStockForOrder(id))
  after(() => notifyOrderEvent(id, 'cancelled'))

  return NextResponse.json({ ok: true })
}
