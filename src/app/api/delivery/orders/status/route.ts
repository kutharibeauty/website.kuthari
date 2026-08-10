import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyOrderEvent } from '@/lib/resend/notify'
import type { AuthMetadata } from '@/types'
import { isDeliveryEnabled } from '@/lib/settings/delivery'

// Delivery persons can only advance an order to 'shipping' / 'out_for_delivery'
export async function PATCH(req: NextRequest) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (supabase as any)
    .from('orders')
    .select('id, status, assigned_to')
    .eq('id', body.order_id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (order.assigned_to !== meta.admin_profile_id) {
    return NextResponse.json({ error: 'Not your order' }, { status: 403 })
  }

  // Allow advancing from assigned/processing/confirmed/packed to shipping/out_for_delivery
  const allowedFrom = ['assigned', 'processing', 'confirmed', 'packed']
  if (!allowedFrom.includes(order.status)) {
    return NextResponse.json({ error: 'Cannot advance from current status' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('orders')
    .update({
      status: 'shipping',
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.order_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email the customer + eligible admins that the order is out for delivery (PRD #4).
  after(() => notifyOrderEvent(body.order_id, 'shipping'))

  return NextResponse.json({ ok: true })
}
