/**
 * Damaged / wrong item requests on delivered orders.
 *
 * The shop doesn't refund money for these: it sends a replacement or swaps the
 * item. The window, reasons and labels live here so the API, the order page,
 * the admin and the policy page all say the same thing.
 */

/** How long after delivery a customer can report a problem. */
export const ISSUE_WINDOW_HOURS = 48
export const MAX_ISSUE_PHOTOS = 5

export const ISSUE_REASONS = {
  damaged: 'Arrived damaged or leaking',
  defective: "Doesn't work or is faulty",
  wrong_item: 'Wrong item sent',
  missing_item: 'Item missing from the parcel',
  expired: 'Expired or near expiry',
} as const
export type IssueReason = keyof typeof ISSUE_REASONS

export const ISSUE_RESOLUTIONS = {
  replacement: 'Send a replacement',
  exchange: 'Exchange for another product',
} as const
export type IssueResolution = keyof typeof ISSUE_RESOLUTIONS

export type IssueStatus = 'requested' | 'approved' | 'rejected' | 'resolved'
export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  requested: 'Under review',
  approved: 'Approved',
  rejected: 'Not approved',
  resolved: 'Replacement sent',
}

export interface IssueItem {
  product_id: string
  name: string
  unit?: string | null
  quantity: number
  image?: string | null
}

export interface OrderIssue {
  id: string
  order_id: string
  reason: IssueReason
  description: string | null
  items: IssueItem[]
  photos: string[]
  resolution: IssueResolution
  status: IssueStatus
  admin_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  resolved_at: string | null
  created_at: string
}

/** When the order counts as delivered (delivery app stamp, else last update). */
export function deliveredAt(order: { delivered_at?: string | null; updated_at?: string | null }): Date | null {
  const t = order.delivered_at ?? order.updated_at
  return t ? new Date(t) : null
}

/** Milliseconds left to report a problem, or 0 once the window has closed. */
export function issueWindowLeft(order: { status: string; delivered_at?: string | null; updated_at?: string | null }, now = Date.now()): number {
  if (order.status !== 'delivered') return 0
  const at = deliveredAt(order)
  if (!at) return 0
  return Math.max(0, at.getTime() + ISSUE_WINDOW_HOURS * 3600_000 - now)
}
