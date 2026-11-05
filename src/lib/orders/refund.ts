import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { isRazorpayConfigured, refundPayment } from '@/lib/razorpay'

export type RefundResult =
  | { ok: true; refundId: string; status: string; amount: number }
  | { ok: false; reason: 'nothing_to_refund' | 'already_refunded' | 'not_configured' | 'not_found' | 'failed'; message?: string }

/**
 * Refund what a customer paid online for an order, through Razorpay.
 *
 * Safe to call more than once: an order that already has a refund id is left
 * alone, and an order with no online payment is skipped. Called when an order
 * is cancelled (by the customer or staff) and from the admin "Refund" button.
 * The razorpay webhook later moves refund_status to processed or failed.
 */
export async function refundOrder(orderId: string, reason = 'Order cancelled'): Promise<RefundResult> {
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (db as any)
    .from('orders')
    .select('id, order_number, total, payment_method, payment_status, payment_reference, amount_paid, refund_id, refund_status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return { ok: false, reason: 'not_found' }
  if (order.refund_id && order.refund_status !== 'failed') return { ok: false, reason: 'already_refunded' }

  // Only the online part is refundable through Razorpay; cash is handed back in person.
  const paid = order.payment_method === 'online' && order.payment_status === 'collected'
    ? Number(order.amount_paid) > 0 ? Number(order.amount_paid) : Number(order.total)
    : Number(order.amount_paid ?? 0)
  if (!order.payment_reference || !(paid > 0)) return { ok: false, reason: 'nothing_to_refund' }
  if (!isRazorpayConfigured()) return { ok: false, reason: 'not_configured' }

  try {
    const r = await refundPayment(order.payment_reference, Math.round(paid * 100), {
      order_id: order.id,
      order_number: String(order.order_number ?? ''),
      reason,
    })
    const status = r.status === 'processed' ? 'processed' : r.status === 'failed' ? 'failed' : 'pending'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from('orders').update({
      refund_id: r.id,
      refund_status: status,
      refund_amount: r.amount / 100,
      refunded_at: new Date().toISOString(),
      payment_status: 'refunded',
      updated_at: new Date().toISOString(),
    }).eq('id', order.id)
    return { ok: true, refundId: r.id, status, amount: r.amount / 100 }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[refund] #${order.order_number} failed:`, message)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from('orders').update({ refund_status: 'failed', updated_at: new Date().toISOString() }).eq('id', order.id)
    return { ok: false, reason: 'failed', message }
  }
}
