/**
 * GET /api/cron/reconcile-payments
 *
 * Runs daily via Vercel Cron (vercel.json), protected by CRON_SECRET.
 *
 * Finds payments Razorpay captured in the last 3 days (recorded by
 * /api/webhooks/razorpay) that have no order with that payment id, and emails
 * the order-email admins once per payment so the shop can fulfil or refund it.
 * Also clears expired rate-limit counters.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PaymentRow = {
  razorpay_payment_id: string
  razorpay_order_id: string | null
  amount_paise: number | null
  email: string | null
  contact: string | null
  created_at: string
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  // Housekeeping for migration 040; harmless if it isn't applied yet.
  await db.rpc('rate_limits_prune').then(() => null, () => null)

  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  // Give the checkout a few minutes to finish on its own before calling it lost.
  const settledBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data: captured, error } = await db
    .from('payment_events')
    .select('razorpay_payment_id, razorpay_order_id, amount_paise, email, contact, created_at')
    .eq('status', 'captured')
    .is('alerted_at', null)
    .gte('created_at', since)
    .lte('created_at', settledBefore)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  const rows = (captured ?? []) as PaymentRow[]
  if (rows.length === 0) return NextResponse.json({ success: true, orphaned: 0 })

  const { data: matched } = await db
    .from('orders')
    .select('payment_reference')
    .in('payment_reference', rows.map((r) => r.razorpay_payment_id))
  const withOrder = new Set(((matched ?? []) as { payment_reference: string }[]).map((o) => o.payment_reference))
  const orphans = rows.filter((r) => !withOrder.has(r.razorpay_payment_id))

  if (orphans.length > 0) {
    const { getOrderEmailAdmins } = await import('@/lib/resend')
    const admins = await getOrderEmailAdmins()
    if (admins.length > 0 && process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@kutharibeauty.com'
      const from = fromEmail.includes('<') ? fromEmail : `${process.env.RESEND_FROM_NAME ?? 'Kuthari Beauty Store'} <${fromEmail}>`
      const lines = orphans.map((o) => {
        const amount = o.amount_paise != null ? `₹${(o.amount_paise / 100).toLocaleString('en-IN')}` : 'amount unknown'
        return `• ${o.razorpay_payment_id} (${amount}) on ${new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}, customer ${o.contact ?? 'no phone'} / ${o.email ?? 'no email'}`
      })
      await resend.emails
        .send({
          from,
          to: admins.map((a) => a.email),
          subject: `${orphans.length} paid ${orphans.length === 1 ? 'payment has' : 'payments have'} no order`,
          text: [
            'Razorpay captured these payments, but no order was created for them (the customer probably closed the page before checkout finished):',
            '',
            ...lines,
            '',
            'Look each one up in the Razorpay dashboard, then either contact the customer and create the order, or refund the payment from Razorpay.',
          ].join('\n'),
        })
        .catch((e: unknown) => console.error('[reconcile-payments] email failed', e))
    }
    await db
      .from('payment_events')
      .update({ alerted_at: new Date().toISOString() })
      .in('razorpay_payment_id', orphans.map((o) => o.razorpay_payment_id))
  }

  return NextResponse.json({ success: true, checked: rows.length, orphaned: orphans.length })
}
