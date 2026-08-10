import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createDeliveryPaymentLink } from '@/lib/razorpay'
import { notifyOrderEvent } from '@/lib/resend/notify'
import type { AuthMetadata } from '@/types'
import { isDeliveryEnabled } from '@/lib/settings/delivery'

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'delivery' || !meta.admin_profile_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!(await isDeliveryEnabled())) {
    return NextResponse.json({ error: 'The delivery panel is currently disabled.' }, { status: 403 })
  }

  let body: {
    order_id: string
    action: 'create_payment_link' | 'confirm_delivery'
    payment_type?: 'cash' | 'online'
    amount_received?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (supabase as any)
    .from('orders')
    .select('id, total, status, assigned_to')
    .eq('id', body.order_id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (order.assigned_to !== meta.admin_profile_id) {
    return NextResponse.json({ error: 'Not your order' }, { status: 403 })
  }

  if (!['shipping', 'out_for_delivery'].includes(order.status)) {
    return NextResponse.json({ error: 'Order not out for delivery' }, { status: 400 })
  }

  // Verify OTP was verified
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: otp } = await (supabase as any)
    .from('delivery_otps')
    .select('is_used')
    .eq('order_id', body.order_id)
    .eq('is_used', true)
    .limit(1)
    .maybeSingle()

  if (!otp) {
    return NextResponse.json({ error: 'Customer OTP not verified' }, { status: 400 })
  }

  // Create Razorpay payment link for online payment
  if (body.action === 'create_payment_link') {
    try {
      const paymentUrl = await createDeliveryPaymentLink(body.order_id, order.total)
      return NextResponse.json({ ok: true, payment_url: paymentUrl })
    } catch (e) {
      return NextResponse.json({ error: 'Failed to create payment link', detail: String(e) }, { status: 500 })
    }
  }

  // Confirm delivery and record payment
  if (body.action === 'confirm_delivery') {
    if (!body.payment_type) {
      return NextResponse.json({ error: 'payment_type required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        payment_status: 'collected',
        payment_collected_by: meta.admin_profile_id,
        payment_method_used: body.payment_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.order_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Email the customer + eligible admins that the order was delivered (PRD #4).
    after(() => notifyOrderEvent(body.order_id, 'delivered'))

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
