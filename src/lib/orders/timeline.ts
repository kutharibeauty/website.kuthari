/**
 * order_timeline row mapping.
 *
 * The DB columns and the UI's field names differ:
 *   DB `description`     ↔ UI `message`
 *   DB `estimated_time`  ↔ UI `estimated_delivery`
 *
 * Blindly spreading the UI's shape into an insert fails with
 * "Could not find the 'estimated_delivery' column of 'order_timeline'", so map
 * explicitly in both directions and never insert raw request bodies.
 */

export interface TimelineEntry {
  id: string
  order_id: string
  status?: string
  title: string
  message?: string | null
  estimated_delivery?: string | null
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapTimelineRow(row: any): TimelineEntry {
  return {
    id: row.id,
    order_id: row.order_id,
    status: row.status ?? undefined,
    title: row.title,
    message: row.description ?? null,
    estimated_delivery: row.estimated_time ?? null,
    created_at: row.created_at,
  }
}
