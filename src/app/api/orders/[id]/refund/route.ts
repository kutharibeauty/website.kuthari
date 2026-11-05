import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/guard'
import { refundOrder } from '@/lib/orders/refund'

/**
 * POST /api/orders/[id]/refund — staff refund of what was paid online.
 *
 * Cancelling an order already refunds it automatically; this is the manual
 * route for a refund that failed, or for a cancelled order from before
 * Razorpay was set up. Refunds the full online amount, once.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const noPerm = await requirePermission('update_order_status'); if (noPerm) return noPerm
  const { id } = await params
  const r = await refundOrder(id, 'Refunded by the shop')
  if (r.ok) return NextResponse.json(r)
  const msg: Record<string, [string, number]> = {
    not_found: ['Order not found', 404],
    already_refunded: ['This order has already been refunded.', 409],
    nothing_to_refund: ['Nothing was paid online for this order.', 400],
    not_configured: ['Razorpay keys are not set, so refunds cannot be made from here.', 503],
    failed: [`Razorpay could not refund this payment${r.message ? `: ${r.message}` : '.'}`, 502],
  }
  const [error, status] = msg[r.reason] ?? ['Refund failed', 500]
  return NextResponse.json({ error }, { status })
}
