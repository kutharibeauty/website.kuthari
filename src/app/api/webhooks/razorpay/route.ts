/**
 * POST /api/webhooks/razorpay
 *
 * Razorpay calls this for payment events (set it up in Razorpay Dashboard →
 * Settings → Webhooks, events: payment.captured, payment.failed, with the
 * secret in RAZORPAY_WEBHOOK_SECRET).
 *
 * It only records what Razorpay says happened. Orders are still created by the
 * checkout itself (api/orders), which verifies the payment again; this table is
 * the safety net that /api/cron/reconcile-payments checks for payments that
 * never turned into an order.
 */
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function validSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  // The signature covers the exact bytes Razorpay sent, so read the raw body.
  const raw = await req.text()
  if (!validSignature(raw, req.headers.get('x-razorpay-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: {
    event?: string
    payload?: { payment?: { entity?: Record<string, unknown> } }
  }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const p = event.payload?.payment?.entity
  if (!p || typeof p.id !== 'string') {
    // Not a payment event we track; acknowledge so Razorpay doesn't retry.
    return NextResponse.json({ ok: true, ignored: event.event ?? 'unknown' })
  }

  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('payment_events').upsert(
    {
      razorpay_payment_id: p.id,
      razorpay_order_id: typeof p.order_id === 'string' ? p.order_id : null,
      event: event.event ?? 'unknown',
      status: typeof p.status === 'string' ? p.status : null,
      amount_paise: typeof p.amount === 'number' ? p.amount : null,
      email: typeof p.email === 'string' ? p.email : null,
      contact: typeof p.contact === 'string' ? p.contact : null,
      raw: event,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'razorpay_payment_id' },
  )

  if (error) {
    // A 500 makes Razorpay retry later, which is what we want if the DB blipped.
    console.error('[razorpay-webhook] could not record payment', error.message)
    return NextResponse.json({ error: 'Could not record' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
