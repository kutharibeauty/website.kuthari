import { auth } from '@/lib/auth/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'
import { isDeliveryEnabled } from '@/lib/settings/delivery'

export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'delivery' || !meta.admin_profile_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!(await isDeliveryEnabled())) {
    return NextResponse.json({ error: 'The delivery panel is currently disabled.' }, { status: 403 })
  }

  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orders, error } = await (supabase as any)
    .from('orders')
    .select('id, status, total, created_at, address, items, payment_method, assigned_to, delivered_at')
    .eq('assigned_to', meta.admin_profile_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!orders || orders.length === 0) {
    return NextResponse.json({ orders: [] })
  }

  // Fetch OTP status for all these orders
  const orderIds = orders.map((o: { id: string }) => o.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: otps } = await (supabase as any)
    .from('delivery_otps')
    .select('order_id, is_used')
    .in('order_id', orderIds)
    .order('created_at', { ascending: false })

  // Build a map: order_id → { sent: true, verified: bool }
  const otpMap: Record<string, { sent: boolean; verified: boolean }> = {}
  for (const o of (otps ?? [])) {
    if (!otpMap[o.order_id]) {
      otpMap[o.order_id] = { sent: true, verified: o.is_used }
    }
  }

  const enriched = orders.map((o: Record<string, unknown>) => ({
    ...o,
    otp_sent: otpMap[o.id as string]?.sent ?? false,
    otp_verified: otpMap[o.id as string]?.verified ?? false,
  }))

  return NextResponse.json({ orders: enriched })
}
