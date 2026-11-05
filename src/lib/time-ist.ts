/**
 * The store runs on India time, but servers (Vercel) run on UTC. Reports that
 * bucket orders by "today" or by day must use IST boundaries, or an order at
 * 2 am in Brahmapur lands on the previous day.
 */
const IST_OFFSET_MS = 330 * 60 * 1000

/** YYYY-MM-DD for the IST calendar day of an ISO timestamp or Date. */
export function istDayKey(d: string | Date): string {
  return new Date(new Date(d).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

/** YYYY-MM for the IST calendar month. */
export function istMonthKey(d: string | Date): string {
  return istDayKey(d).slice(0, 7)
}

/** The UTC instant at which the IST day containing `d` starts. */
export function istDayStart(d: Date = new Date()): Date {
  const key = istDayKey(d)
  return new Date(new Date(`${key}T00:00:00.000Z`).getTime() - IST_OFFSET_MS)
}

/** The UTC instant at which the IST month containing `d` starts. */
export function istMonthStart(d: Date = new Date()): Date {
  const key = istMonthKey(d)
  return new Date(new Date(`${key}-01T00:00:00.000Z`).getTime() - IST_OFFSET_MS)
}

/** Shift an instant by whole days. */
export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000)
}

/** A short label for an IST day key: "4 Nov". */
export function dayLabel(key: string): string {
  return new Date(`${key}T12:00:00.000Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** A short label for an IST month key: "Nov 26". */
export function monthLabel(key: string): string {
  return new Date(`${key}-15T12:00:00.000Z`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

/** Today's date in IST, written out: "Wednesday, 4 November 2026". */
export function istTodayLong(): string {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
}
