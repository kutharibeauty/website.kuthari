import { Resend } from 'resend'
import { render } from '@react-email/components'
import type { OrderItem, Address } from '@/types/database.types'

const resend = new Resend(process.env.RESEND_API_KEY)

// Compose "Name <email>" so inboxes show a friendly sender. If the configured
// FROM_EMAIL already contains a display name (has a "<"), use it as-is.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@kutharibeauty.com'
const FROM_NAME = process.env.RESEND_FROM_NAME ?? 'Kuthari Beauty Store'
const FROM = FROM_EMAIL.includes('<') ? FROM_EMAIL : `${FROM_NAME} <${FROM_EMAIL}>`
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kutharibeauty.com'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OrderEmailData {
  orderId: string
  orderNumber: string
  items: OrderItem[]
  address: Address
  subtotal: number
  deliveryFee: number
  discount?: number
  couponCode?: string | null
  total: number
  createdAt: string
  customerEmail?: string | null
  customerName?: string
  estimatedDelivery?: string | null
  customMessage?: string | null
  confirmedByName?: string | null
  status?: string
  notes?: string | null
  transportDetails?: string | null
  gstin?: string | null
  gstBusinessName?: string | null
  /** Admin-set email subject line; overrides the auto-generated one when set. */
  customSubject?: string | null
  /** 'online' | 'partial' | 'cod' and what was paid online now. */
  paymentMethod?: string | null
  amountPaid?: number | null
}

export interface AdminRecipient {
  email: string
  name: string
}

export interface LowStockEmailData {
  products: Array<{ id: string; name: string; sku: string | null; stockQty: number; lowStockThreshold: number }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function renderTemplate(Component: React.ComponentType<Record<string, unknown>>, props: Record<string, unknown>): Promise<string> {
  const React = await import('react')
  return render(React.createElement(Component as React.ComponentType, props))
}

/** Fetch all admin emails where receive_order_emails = true AND role != delivery */
export async function getOrderEmailAdmins(): Promise<AdminRecipient[]> {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('admin_profiles')
    .select('name, email, role, permissions')
    .eq('is_active', true)
    .not('email', 'is', null)

  if (!data) return []
  return (data as Array<{ name: string; email: string | null; role: string; permissions: Record<string, boolean> | null }>)
    .filter(
      (a) =>
        a.email &&
        a.role !== 'delivery' &&
        (a.role === 'super_admin' || a.permissions?.receive_order_emails === true),
    )
    .map((a) => ({ name: a.name, email: a.email! }))
}

/** Fetch super-admin + manage_products admins for low stock alerts */
export async function getLowStockAlertAdmins(): Promise<AdminRecipient[]> {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('admin_profiles')
    .select('name, email, role, permissions')
    .eq('is_active', true)
    .not('email', 'is', null)

  if (!data) return []
  return (data as Array<{ name: string; email: string | null; role: string; permissions: Record<string, boolean> }>)
    .filter(a => a.email && (a.role === 'super_admin' || a.permissions?.manage_products))
    .map(a => ({ name: a.name, email: a.email! }))
}

// ── Email Senders ──────────────────────────────────────────────────────────────

/**
 * One-time welcome email for a brand-new customer who signed up WITH an email.
 * No-op if no email is given (phone-only signups get nothing).
 */
export async function sendWelcomeCustomer(data: { email: string | null; name?: string | null }): Promise<void> {
  if (!data.email) return
  const { default: Template } = await import('./templates/welcome-customer')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { name: data.name ?? null, siteUrl: SITE_URL })
  await resend.emails.send({
    from: FROM,
    to: data.email,
    subject: 'Welcome to Kuthari Beauty Store! 🎉',
    html,
  })
}

export async function sendOrderPlacedCustomer(data: OrderEmailData): Promise<void> {
  if (!data.customerEmail) return
  const { default: Template } = await import('./templates/order-placed-customer')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  await resend.emails.send({
    from: FROM,
    to: data.customerEmail,
    subject: `Order Placed! #${data.orderNumber} — KUTHARI BEAUTY STORE`,
    html,
  })
}

export async function sendOrderPlacedAdmin(data: OrderEmailData, admins: AdminRecipient[]): Promise<void> {
  if (!admins.length) return
  const { default: Template } = await import('./templates/order-placed-admin')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  await resend.emails.send({
    from: FROM,
    to: admins.map(a => a.email),
    subject: `🛒 New Order #${data.orderNumber} | ₹${data.total.toLocaleString('en-IN')} | ${data.address.phone}`,
    html,
  })
}

export async function sendOrderConfirmedCustomer(data: OrderEmailData): Promise<void> {
  if (!data.customerEmail) return
  const { default: Template } = await import('./templates/order-confirmed-customer')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  const attachments = await buildInvoiceAttachment(data)
  await resend.emails.send({
    from: FROM,
    to: data.customerEmail,
    subject: data.customSubject?.trim() || `✅ Order Confirmed! #${data.orderNumber} — KUTHARI BEAUTY STORE`,
    html,
    attachments,
  })
}

export async function sendOrderStatusUpdate(data: OrderEmailData): Promise<void> {
  if (!data.customerEmail) return
  const isDelivered = data.status === 'delivered'
  const { default: Template } = await import('./templates/order-status-update')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  const attachments = isDelivered ? await buildInvoiceAttachment(data) : []
  const statusTitle = STATUS_TITLES[data.status ?? ''] ?? data.status ?? 'Updated'
  // Admin-set subject wins; otherwise the auto-generated one.
  const subject = data.customSubject?.trim() || `📦 Order Update: ${statusTitle} | #${data.orderNumber}`
  await resend.emails.send({
    from: FROM,
    to: data.customerEmail,
    subject,
    html,
    attachments,
  })
}

/**
 * Notify staff on EVERY order status change (PRD item #4). Recipients come from
 * getOrderEmailAdmins() which already includes super_admin unconditionally and
 * every admin with receive_order_emails, excluding delivery staff.
 */
export async function sendOrderStatusAdmin(data: OrderEmailData, admins: AdminRecipient[]): Promise<void> {
  if (!admins.length) return
  const title = STATUS_TITLES[data.status ?? ''] ?? data.status ?? 'Updated'
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e1d9;border-radius:12px;overflow:hidden">
    <div style="background:#1b2c3d;color:#faf6ee;padding:16px 20px;font-weight:700;letter-spacing:1px">KUTHARI BEAUTY STORE — Order Update</div>
    <div style="padding:20px;color:#1b2c3d">
      <p style="margin:0 0 10px;font-size:15px">Order <strong>#${data.orderNumber}</strong> is now <strong>${title}</strong>.</p>
      <p style="margin:0 0 4px;font-size:13px;color:#4f453f">Customer: ${data.customerName ?? '—'}${data.address?.phone ? ` · ${data.address.phone}` : ''}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#4f453f">Total: ₹${data.total.toLocaleString('en-IN')}</p>
      ${data.estimatedDelivery ? `<p style="margin:0;font-size:13px;color:#4f453f">ETA: ${data.estimatedDelivery}</p>` : ''}
    </div>
  </div>`
  await resend.emails.send({
    from: FROM,
    to: admins.map(a => a.email),
    subject: `📦 Order ${title} — #${data.orderNumber}`,
    html,
  })
}

export async function sendLowStockAlert(data: LowStockEmailData, admins: AdminRecipient[]): Promise<void> {
  if (!admins.length || !data.products.length) return
  const { default: Template } = await import('./templates/low-stock-alert')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  const names = data.products.map(p => p.name).join(', ')
  await resend.emails.send({
    from: FROM,
    to: admins.map(a => a.email),
    subject: `⚠️ Low Stock Alert: ${names.slice(0, 60)}${names.length > 60 ? '…' : ''}`,
    html,
  })
}

// ── Invoice PDF attachment ─────────────────────────────────────────────────────

async function buildInvoiceAttachment(data: OrderEmailData): Promise<Array<{ filename: string; content: string }>> {
  try {
    const { generateInvoicePdfBase64 } = await import('@/lib/pdf/invoice')
    const base64 = await generateInvoicePdfBase64(data)
    return [{ filename: `KBS-Invoice-${data.orderNumber}.pdf`, content: base64 }]
  } catch {
    return []
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_TITLES: Record<string, string> = {
  confirmed:        'Order Confirmed',
  packed:           'Order Packed',
  shipping:         'Out for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Order Cancelled',
}
