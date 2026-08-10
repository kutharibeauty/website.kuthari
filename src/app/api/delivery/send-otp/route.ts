import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/message-central'
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

  let body: { order_id: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify this order is assigned to this delivery person
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (supabase as any)
    .from('orders')
    .select('id, address, status, assigned_to')
    .eq('id', body.order_id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (order.assigned_to !== meta.admin_profile_id) {
    return NextResponse.json({ error: 'Not your order' }, { status: 403 })
  }

  if (!['shipping', 'out_for_delivery'].includes(order.status)) {
    return NextResponse.json({ error: 'Order not out for delivery' }, { status: 400 })
  }

  const phone: string = (order.address as { phone?: string })?.phone ?? ''
  const customerName: string = (order.address as { name?: string })?.name ?? 'Customer'

  // Enforce max 3 OTP sends per order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: sendCount } = await (supabase as any)
    .from('delivery_otps')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', body.order_id)

  if ((sendCount ?? 0) >= 3) {
    return NextResponse.json({ error: 'Maximum OTP sends reached for this order. Contact support.' }, { status: 429 })
  }

  // §1.8: use a cryptographically secure source, not Math.random(), for the
  // 6-digit door OTP sent over SMS.
  const otp = String(randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  // Expire all previous OTPs for this order (keep rows for send-count tracking)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('delivery_otps')
    .update({ expires_at: new Date().toISOString() })
    .eq('order_id', body.order_id)
    .eq('is_used', false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('delivery_otps').insert({
    order_id: body.order_id,
    delivery_man_id: meta.admin_profile_id,
    customer_phone: phone,
    otp,
    expires_at: expiresAt,
    is_used: false,
    attempts: 0,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sendSms(
    phone,
    `Dear ${customerName}, your BCR Traders delivery OTP is ${otp}. Share only with your delivery person. Valid for 10 minutes.`,
  )

  return NextResponse.json({ ok: true, phone_last4: phone.slice(-4) })
}
