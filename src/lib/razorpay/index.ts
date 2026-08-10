import Razorpay from 'razorpay'
import crypto from 'crypto'

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
): Promise<{ id: string; amount: number; currency: string }> {
  const rz = getRazorpay()
  const order = await rz.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt,
    // Auto-capture so a successful payment is settled, not left authorized.
    payment_capture: true,
  })
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
  const p = (await rz.payments.fetch(paymentId)) as any
  return { status: String(p.status), amount: Number(p.amount), orderId: p.order_id ? String(p.order_id) : null }
}

export async function createDeliveryPaymentLink(
  orderId: string,
  amount: number, // in ₹
): Promise<string> {
  const rz = getRazorpay()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const link = await (rz.paymentLink as any).create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    description: `Kuthari Beauty Store Order #${orderId.slice(-8).toUpperCase()}`,
    reminder_enable: false,
    upi_link: true,
  })
  return link.short_url as string
}
