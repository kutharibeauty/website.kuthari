import { createAdminClient } from '@/lib/supabase/server'
import type { Address, OrderItem } from '@/types/database.types'
import type { OrderEmailData } from './index'

/**
 * PRD item #4 — single reusable "notify on order event" entry point.
 *
 * Fires on EVERY order status transition and:
 *   • emails the customer a status-appropriate update, and
 *   • emails every eligible admin/super-admin (getOrderEmailAdmins already
 *     includes super_admin unconditionally and excludes delivery staff).
 *
 * All sends are best-effort (Promise.allSettled) and any failure is logged, never
 * thrown — an email problem must never block or roll back the status change that
 * the caller has already committed.
 */
export async function notifyOrderEvent(
  orderId: string,
  status: string,
  opts: { adminProfileId?: string | null; skipCustomer?: boolean; subjectOverride?: string | null; customMessage?: string | null } = {},
): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Select '*' rather than an explicit column list. The LIVE orders table has
    // drifted from the migrations (see migration 008) and may be missing optional
    // columns like discount / coupon_code / estimated_delivery / custom_message /
    // notes. Enumerating a missing column makes the whole query error → null order
    // → the status-update email silently never sends (the classic "placed email
    // arrives but status updates don't" bug). '*' returns whatever exists; every
    // optional field below is read defensively with `?? null`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: orderErr } = await (supabase as any)
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr) { console.error(`[notifyOrderEvent] order fetch failed for ${orderId}:`, orderErr.message); return }
    if (!order) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email')
      .eq('id', order.user_id ?? '')
      .maybeSingle()

    let confirmedByName: string | null = null
    if (opts.adminProfileId && status === 'confirmed') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: adminProfile } = await (supabase as any)
        .from('admin_profiles')
        .select('name')
        .eq('id', opts.adminProfileId)
        .maybeSingle()
      confirmedByName = (adminProfile as { name?: string } | null)?.name ?? null
    }

    const addr = order.address as Address
    const emailData: OrderEmailData = {
      orderId,
      orderNumber: order.order_number,
      items: order.items as OrderItem[],
      address: addr,
      subtotal: order.subtotal,
      deliveryFee: order.delivery_fee ?? 0,
      discount: order.discount ?? 0,
      couponCode: order.coupon_code ?? null,
      total: order.total,
      createdAt: order.created_at,
      customerEmail: (profile as { email?: string | null } | null)?.email ?? null,
      customerName: addr?.name,
      estimatedDelivery: order.estimated_delivery ?? null,
      // Only the message the admin typed for THIS notification — never the
      // persisted order.custom_message column. Reading the column made a note
      // sent once re-appear on every later status email (cancelled, delivered…).
      customMessage: opts.customMessage ?? null,
      confirmedByName,
      status,
      notes: order.notes ?? null,
      gstin: order.gstin ?? null,
      gstBusinessName: order.gst_business_name ?? null,
      customSubject: opts.subjectOverride?.trim() || null,
    }

    const resend = await import('./index')
    const admins = await resend.getOrderEmailAdmins()

    const customerSend = opts.skipCustomer
      ? Promise.resolve()
      : status === 'confirmed'
        ? resend.sendOrderConfirmedCustomer(emailData)
        : resend.sendOrderStatusUpdate(emailData)

    const results = await Promise.allSettled([
      customerSend,
      resend.sendOrderStatusAdmin(emailData, admins),
    ])

    results.forEach((r) => {
      if (r.status === 'rejected') console.error(`[notifyOrderEvent] send failed for #${order.order_number} (${status}):`, r.reason)
    })
  } catch (e) {
    console.error('[notifyOrderEvent] error:', e)
  }
}
