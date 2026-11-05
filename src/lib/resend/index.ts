import { Resend } from 'resend'
import { render } from '@react-email/components'
import type { OrderItem, Address } from '@/types/database.types'
import { SITE_URL } from '@/lib/site-url'

const resend = new Resend(process.env.RESEND_API_KEY)

// Compose "Name <email>" so inboxes show a friendly sender. If the configured
// FROM_EMAIL already contains a display name (has a "<"), use it as-is.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@kutharibeauty.com'
const FROM_NAME = process.env.RESEND_FROM_NAME ?? 'Kuthari Beauty Store'
const FROM = FROM_EMAIL.includes('<') ? FROM_EMAIL : `${FROM_NAME} <${FROM_EMAIL}>`

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

export interface IssueEmailData {
  orderId: string
  orderNumber: string
  deliveredAt?: string | null
  issue: import('@/lib/orders/issues').OrderIssue
  customer: { name: string; phone: string; email?: string | null; address?: Address | null }
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

/**
 * Everyone who gets staff emails: every active admin and super admin with an
 * email address, unless they switched notifications off in Admin → Admin
 * Profiles. A locked person (the owner) always gets them, whatever the switch
 * says. Delivery staff never do. One rule for every staff email: new orders,
 * status changes, damaged-item requests, low stock and payment checks.
 */
export async function getStaffEmailRecipients(): Promise<AdminRecipient[]> {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()
  // '*' so this still works if migration 049 (email_notifications) is missing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('admin_profiles')
    .select('*')
    .eq('is_active', true)
    .in('role', ['super_admin', 'admin'])
    .not('email', 'is', null)

  if (!data) return []
  const seen = new Set<string>()
  return (data as Array<{ name: string; email: string | null; email_notifications?: boolean | null; email_locked?: boolean | null }>)
    .filter((a) => a.email && (a.email_locked === true || a.email_notifications !== false))
    .filter((a) => { const k = a.email!.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
    .map((a) => ({ name: a.name, email: a.email!.trim() }))
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
    subject: 'Welcome to Kuthari Beauty Store',
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
    subject: `We've got your order #${data.orderNumber}`,
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
    subject: `New order #${data.orderNumber} · ₹${data.total.toLocaleString('en-IN')} · ${data.address.name}`,
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
    subject: data.customSubject?.trim() || `Order #${data.orderNumber} is confirmed`,
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
  const subject = data.customSubject?.trim() || `${statusTitle}: order #${data.orderNumber}`
  await resend.emails.send({
    from: FROM,
    to: data.customerEmail,
    subject,
    html,
    attachments,
  })
}

/**
 * Notify staff on EVERY order status change. Recipients: getStaffEmailRecipients().
 */
export async function sendOrderStatusAdmin(data: OrderEmailData, admins: AdminRecipient[]): Promise<void> {
  if (!admins.length) return
  const title = STATUS_TITLES[data.status ?? ''] ?? data.status ?? 'Updated'
  const { default: Template } = await import('./templates/order-status-admin')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, title, siteUrl: SITE_URL })
  await resend.emails.send({
    from: FROM,
    to: admins.map(a => a.email),
    subject: `Order #${data.orderNumber}: ${title}`,
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
    subject: `Restock: ${names.slice(0, 60)}${names.length > 60 ? '…' : ''}`,
    html,
  })
}

// ── Damaged / wrong item requests ──────────────────────────────────────────────

const ISSUE_SUBJECT: Record<string, (n: string) => string> = {
  requested: (n) => `We've got your request for order #${n}`,
  approved: (n) => `Approved: we'll replace your item from order #${n}`,
  rejected: (n) => `About your request for order #${n}`,
  resolved: (n) => `Your replacement for order #${n} is on its way`,
}

export async function sendIssueCustomer(data: IssueEmailData): Promise<void> {
  if (!data.customer.email) return
  const { default: Template } = await import('./templates/issue-customer')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, siteUrl: SITE_URL })
  await resend.emails.send({
    from: FROM,
    to: data.customer.email,
    subject: (ISSUE_SUBJECT[data.issue.status] ?? ISSUE_SUBJECT.requested)(data.orderNumber),
    html,
  })
}

export async function sendIssueAdmin(data: IssueEmailData, admins: AdminRecipient[], variant: 'new' | 'approved'): Promise<void> {
  if (!admins.length) return
  const { default: Template } = await import('./templates/issue-admin')
  const html = await renderTemplate(Template as unknown as React.ComponentType<Record<string, unknown>>, { ...data, variant, siteUrl: SITE_URL })
  await resend.emails.send({
    from: FROM,
    to: admins.map((a) => a.email),
    subject: variant === 'new'
      ? `Damaged / wrong item: order #${data.orderNumber} · ${data.customer.name}`
      : `Book ${data.issue.resolution}: order #${data.orderNumber} · ${data.customer.name} ${data.customer.phone}`,
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
  returned:         'Order Returned',
}
