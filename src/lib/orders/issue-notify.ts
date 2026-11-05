import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import type { Address } from '@/types/database.types'
import type { OrderIssue } from './issues'

/**
 * Email everyone who needs to know about a damaged / wrong item request.
 *
 *  - requested → customer ("we got it") + every order-email admin (review it)
 *  - approved  → customer + every order-email admin with the booking details
 *  - rejected / resolved → customer only
 *
 * Best effort: failures are logged, never thrown, so a mail outage can't block
 * the request itself.
 */
export async function notifyIssue(issueId: string): Promise<void> {
  try {
    const db = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: issue } = await (db as any).from('order_issues').select('*').eq('id', issueId).maybeSingle()
    if (!issue) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = await (db as any)
      .from('orders').select('id, order_number, user_id, address, delivered_at, updated_at').eq('id', issue.order_id).maybeSingle()
    if (!order) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (db as any)
      .from('profiles').select('name, phone, email').eq('id', order.user_id ?? '').maybeSingle()

    const address = order.address as Address | null
    const data = {
      orderId: order.id as string,
      orderNumber: String(order.order_number),
      deliveredAt: (order.delivered_at ?? null) as string | null,
      issue: issue as OrderIssue,
      customer: {
        name: address?.name || profile?.name || 'Customer',
        phone: address?.phone || profile?.phone || '',
        email: profile?.email ?? null,
        address,
      },
    }

    const resend = await import('@/lib/resend')
    const sends: Promise<void>[] = [resend.sendIssueCustomer(data)]
    if (issue.status === 'requested' || issue.status === 'approved') {
      const admins = await resend.getStaffEmailRecipients()
      sends.push(resend.sendIssueAdmin(data, admins, issue.status === 'requested' ? 'new' : 'approved'))
    }
    const results = await Promise.allSettled(sends)
    results.forEach((r) => {
      if (r.status === 'rejected') console.error(`[notifyIssue] ${issueId} (${issue.status}) send failed:`, r.reason)
    })
  } catch (e) {
    console.error('[notifyIssue] error:', e)
  }
}
