/**
 * PATCH /api/orders/[id]/return
 *
 * Admin-only. Marks an order as "returned", sets returned_at,
 * and restores stock_qty for each item in the order.
 * Only allowed on orders that are 'delivered'.
 *
 * ── NOT a customer returns feature ──────────────────────────────────────────
 * Kuthari Beauty Store's published policy is no change-of-mind returns (damaged or
 * wrong items are replaced through order_issues, api/orders/[id]/issue) —
 * the Product JSON-LD
 * states schema.org/MerchantReturnNotPermitted (see lib/seo/return-policy.ts).
 * This endpoint is internal exception handling for the back office: an admin
 * recording goods that came back (damaged, wrong item shipped, refused on
 * delivery) so stock is corrected and the customer is notified. It does NOT
 * imply customer-initiated returns are accepted, and must never be exposed to
 * a customer-facing surface — the role check below is the enforcement point,
 * and it is deliberately server-side rather than relying on hidden UI.
 *
 * It issues no refund; it only moves status, restores stock and emails.
 *
 * Note: as of this audit nothing in the app calls this route. Admins reach the
 * same outcome through the status dropdown -> PATCH /api/orders/[id]/status
 * ('returned' is in its VALID_STATUSES and STOCK_RESTORED_STATUSES). Kept
 * because it is the stricter path — it refuses any order that isn't
 * 'delivered', which the generic status route does not check.
 */
import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyOrderEvent } from '@/lib/resend/notify'
import { NextRequest, NextResponse, after } from 'next/server'
import type { AuthMetadata } from '@/types'
import { restoreStockForOrder } from '@/lib/orders/stock'
import { requirePermission } from '@/lib/auth/guard'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const noPerm = await requirePermission('update_order_status'); if (noPerm) return noPerm
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  // Fetch the order (verify it exists and is in a returnable state)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: fetchError } = await (supabase as any)
    .from('orders')
    .select('id, status, items')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'delivered') {
    return NextResponse.json(
      { error: 'Only delivered orders can be marked as returned' },
      { status: 422 },
    )
  }

  const now = new Date().toISOString()

  // Mark order as returned
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('orders')
    .update({ status: 'returned', returned_at: now, updated_at: now })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Use the shared helper the cancel/status routes use. Its predecessor here
  // restored `quantity`, but the order route decrements `stock_units` — for a
  // packaged product those differ, so a return used to put back the wrong count.
  after(() => restoreStockForOrder(id))

  // Email the customer + eligible admins that the order was returned (PRD #4).
  after(() => notifyOrderEvent(id, 'returned'))

  return NextResponse.json({ ok: true, returned_at: now })
}
