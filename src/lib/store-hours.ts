// Store ordering hours. Orders are accepted only inside the open window; the
// cart and checkout disable their CTAs outside it, and the order route rejects
// a late order authoritatively. Customers can always BROWSE — only checkout is
// gated.
//
// The window is admin-configurable in Settings (the `settings` CMS row). All
// times are evaluated in IST (Asia/Kolkata) regardless of where the server runs
// (Vercel is UTC) or where the customer's device is set — these are the store's
// local business hours, not the viewer's.

export interface OrderHoursConfig {
  /** When false, ordering is allowed 24/7 (the window is ignored). */
  enabled: boolean
  /** Window start, minutes since IST midnight (0–1439). */
  openMinute: number
  /** Window end, minutes since IST midnight (0–1439). */
  closeMinute: number
}

// Defaults preserve the originally shipped window (4:00 AM–8:30 PM) so behaviour
// is unchanged until an admin edits it.
export const DEFAULT_ORDER_HOURS: OrderHoursConfig = {
  enabled: true,
  openMinute: 4 * 60, // 04:00
  closeMinute: 20 * 60 + 30, // 20:30
}

/** "HH:MM" (24h) → minutes since midnight, or null if malformed. */
export function parseTimeToMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const m = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

/** Minutes since midnight → "HH:MM" (24h), for an <input type="time">. */
export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Read the admin's order-hours off the `settings` CMS value. Any missing or
 * malformed field falls back to the default, so a partial/absent config can
 * never accidentally lock ordering to a broken window.
 */
export function parseOrderHours(settingsValue: unknown): OrderHoursConfig {
  if (!settingsValue || typeof settingsValue !== 'object') return DEFAULT_ORDER_HOURS
  const v = settingsValue as Record<string, unknown>
  const open = parseTimeToMinutes(v.order_open_time)
  const close = parseTimeToMinutes(v.order_close_time)
  return {
    enabled: typeof v.order_hours_enabled === 'boolean' ? v.order_hours_enabled : DEFAULT_ORDER_HOURS.enabled,
    openMinute: open ?? DEFAULT_ORDER_HOURS.openMinute,
    closeMinute: close ?? DEFAULT_ORDER_HOURS.closeMinute,
  }
}

/** Minutes elapsed since IST midnight for the given instant (0–1439). */
export function istMinutesOfDay(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return (h % 24) * 60 + m
}

/** True when ordering is currently allowed for the given config. */
export function isOrderingOpen(config: OrderHoursConfig = DEFAULT_ORDER_HOURS, date: Date = new Date()): boolean {
  if (!config.enabled) return true
  const mins = istMinutesOfDay(date)
  const { openMinute: o, closeMinute: c } = config
  // Degenerate window (open == close) can't sensibly gate anything — leave open.
  if (o === c) return true
  // Same-day window (e.g. 04:00–20:30): open on [o, c).
  if (o < c) return mins >= o && mins < c
  // Overnight window (e.g. 20:00–04:00): open when past open OR before close.
  return mins >= o || mins < c
}

/** "4:00 AM" / "8:30 PM" style label for a minutes-since-midnight value. */
export function formatMinute(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
