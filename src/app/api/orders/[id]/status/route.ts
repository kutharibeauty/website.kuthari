import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse, after } from 'next/server'
import type { AuthMetadata } from '@/types'
import type { OrderStatus } from '@/types/database.types'
import { notifyOrderEvent } from '@/lib/resend/notify'
import { restoreStockForOrder } from '@/lib/orders/stock'

const VALID_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled', 'returned']

// Statuses in which the order's stock has been given back to inventory. Used to
// restore stock exactly once — moving between two of these (e.g. cancelled →
// returned) must NOT restore it a second time.
const STOCK_RESTORED_STATUSES: string[] = ['cancelled', 'returned']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: { status?: OrderStatus; notes?: string; estimated_delivery?: string; custom_message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Previous status decides whether this transition should return stock.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('orders')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  const prevStatus = existing.status as string

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status) updateData.status = body.status
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.estimated_delivery !== undefined) updateData.estimated_delivery = body.estimated_delivery
  if (body.custom_message !== undefined) updateData.custom_message = body.custom_message

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('orders')
    .update(updateData)
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Could not update the order status', detail: error.message }, { status: 500 })

  // Stamp returned_at separately and best-effort: `returned_at` may be absent on
  // the drifted live table, and a missing column would fail the whole update —
  // the status change itself must never depend on it.
  if (body.status === 'returned' && prevStatus !== 'returned') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: tsErr } = await (supabase as any)
      .from('orders')
      .update({ returned_at: new Date().toISOString() })
      .eq('id', id)
    if (tsErr) console.warn('returned_at not stamped (column missing?):', tsErr.message)
  }

  // Give stock back when an order first enters cancelled/returned — but never
  // twice (e.g. cancelled → returned already had its stock restored).
  if (
    body.status &&
    STOCK_RESTORED_STATUSES.includes(body.status) &&
    !STOCK_RESTORED_STATUSES.includes(prevStatus)
  ) {
    after(() => restoreStockForOrder(id))
  }

  // Notify the customer AND every eligible admin/super-admin on each status
  // change (PRD #4). Best-effort — never blocks the status update.
  if (body.status && ['confirmed', 'packed', 'shipping', 'delivered', 'cancelled', 'returned'].includes(body.status)) {
    const status = body.status
    after(() => notifyOrderEvent(id, status, { adminProfileId: meta?.admin_profile_id ?? null, customMessage: body.custom_message?.trim() || null }))
  }

  return NextResponse.json({ ok: true })
}

