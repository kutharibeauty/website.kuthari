import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'
import { isDeliveryEnabled } from '@/lib/settings/delivery'

const MAX_ATTEMPTS = 5

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

  let body: { order_id: string; otp: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // PRD Rule #5 / §1.8: a delivery person may only verify the door-OTP for an
  // order actually assigned to them — role alone is not enough, or any delivery
  // account could complete-deliver any order by guessing its id. Mirrors the
  // same `assigned_to` guard already enforced in send-otp.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (supabase as any)
    .from('orders')
    .select('id, assigned_to')
    .eq('id', body.order_id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.assigned_to !== meta.admin_profile_id) {
    return NextResponse.json({ error: 'Not your order' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: record } = await (supabase as any)
    .from('delivery_otps')
    .select('id, otp, expires_at, is_used, attempts, verified_at')
    .eq('order_id', body.order_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!record) return NextResponse.json({ error: 'OTP not sent yet' }, { status: 400 })

  if (record.is_used) {
    return NextResponse.json({ ok: true, already_verified: true })
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Too many attempts. Please resend OTP.' }, { status: 400 })
  }

  if (new Date(record.expires_at) < new Date()) {
    return NextResponse.json({ error: 'OTP expired. Please resend.' }, { status: 400 })
  }

  // Increment attempts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('delivery_otps')
    .update({ attempts: record.attempts + 1 })
    .eq('id', record.id)

  if (record.otp !== body.otp.trim()) {
    return NextResponse.json({ error: 'Incorrect OTP' }, { status: 400 })
  }

  // Mark as used / verified
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('delivery_otps')
    .update({ is_used: true, verified_at: new Date().toISOString() })
    .eq('id', record.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
