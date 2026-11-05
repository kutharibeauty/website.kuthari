import Razorpay from 'razorpay'
import crypto from 'crypto'

/** Razorpay's SDK has no timeout option; give every call one so a slow gateway
 *  can't hang checkout. */
function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Razorpay timed out after ${ms}ms`)), ms)),
  ])
}

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

/** True when the server has Razorpay credentials configured. */
export function isRazorpayConfigured(): boolean {
  return !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET
}

/**
 * Create a Razorpay order for the customer checkout. `amountPaise` must be the
 * authoritative, server-computed amount — the Razorpay order fixes what the
 * customer can pay, so the amount can't be tampered with client-side.
 */
export async function createCheckoutOrder(
  amountPaise: number,
  receipt: string,
  notes?: Record<string, string>,
): Promise<{ id: string; amount: number; currency: string }> {
  const rz = getRazorpay()
  const order = await withTimeout(rz.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt,
    // Shown in the Razorpay dashboard, so a payment can be found by phone or mode.
    ...(notes ? { notes } : {}),
    // Auto-capture so a successful payment is settled, not left authorized.
    payment_capture: true,
  }))
  return { id: order.id as string, amount: Number(order.amount), currency: order.currency as string }
}

/**
 * Verify the checkout callback signature: HMAC-SHA256(order_id|payment_id) with
 * the key secret must equal the signature Razorpay returned. Proves the callback
 * genuinely came from Razorpay and wasn't forged by the client.
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret || !razorpayOrderId || !razorpayPaymentId || !signature) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Fetch a payment from Razorpay to confirm it's real, captured, and its amount. */
export async function fetchPayment(
  paymentId: string,
): Promise<{ status: string; amount: number; orderId: string | null }> {
  const rz = getRazorpay()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (await withTimeout(rz.payments.fetch(paymentId))) as any
  return { status: String(p.status), amount: Number(p.amount), orderId: p.order_id ? String(p.order_id) : null }
}

/**
 * A payment link for the cash balance of an order, sent to the customer by SMS
 * (and email when known). reference_id and payment_link_id tie it back to the
 * order, so the payment_link.paid webhook can mark the balance paid. Expires in
 * three days.
 */
export async function createDeliveryPaymentLink(opts: {
  orderId: string
  orderNumber?: string | null
  amount: number // in ₹
  customer?: { name?: string | null; phone?: string | null; email?: string | null }
}): Promise<{ id: string; url: string }> {
  const rz = getRazorpay()
  const label = opts.orderNumber || opts.orderId.slice(-8).toUpperCase()
  const phone = (opts.customer?.phone ?? '').replace(/\D/g, '').slice(-10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const link: { id?: string; short_url?: string } = await withTimeout((rz.paymentLink as any).create({
    amount: Math.round(opts.amount * 100), // paise
    currency: 'INR',
    description: `Kuthari Beauty Store order #${label}`,
    // Razorpay rejects a reused reference_id, so add a short suffix per link.
    reference_id: `${opts.orderId.slice(0, 30)}-${Date.now().toString(36)}`,
    expire_by: Math.floor(Date.now() / 1000) + 3 * 24 * 3600,
    customer: {
      ...(opts.customer?.name ? { name: opts.customer.name } : {}),
      ...(phone.length === 10 ? { contact: `+91${phone}` } : {}),
      ...(opts.customer?.email ? { email: opts.customer.email } : {}),
    },
    notify: { sms: phone.length === 10, email: !!opts.customer?.email },
    reminder_enable: true,
    upi_link: false,
    notes: { order_id: opts.orderId, order_number: String(label) },
  }))
  return { id: String(link.id), url: String(link.short_url) }
}

/**
 * Refund a captured payment, fully or in part. speed 'optimum' makes it instant
 * where the customer's bank supports it and falls back to a normal refund
 * otherwise. Returns Razorpay's refund id and status ('pending' | 'processed' | 'failed').
 */
export async function refundPayment(
  paymentId: string,
  amountPaise: number,
  notes?: Record<string, string>,
): Promise<{ id: string; status: string; amount: number }> {
  const rz = getRazorpay()
  const r = (await withTimeout(rz.payments.refund(paymentId, {
    amount: amountPaise,
    speed: 'optimum',
    ...(notes ? { notes } : {}),
  }))) as { id: string; status: string; amount?: number | string }
  return { id: String(r.id), status: String(r.status), amount: Number(r.amount) }
}
