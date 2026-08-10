import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Serialize a value for safe embedding inside a
 * <script type="application/ld+json"> block. Escapes `<` so a field value that
 * contains "</script>" (e.g. a product description or review body) cannot break
 * out of the script tag and inject markup. Safe for client or server use.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

const LAKH = 1_00_000
const CRORE = 1_00_00_000

/**
 * Compact rupee label for chart axes and KPI tiles, in the INDIAN numbering
 * system: thousands as `k`, then lakh (1,00,000 -> `1.0L`) and crore
 * (1,00,00,000 -> `1.0Cr`). Western `M`/`B` scales never apply.
 *
 * One decimal place, matching the `240.0k` style already on the dashboard, so
 * only the scale changes and not the look. Full (non-abbreviated) numbers
 * should keep going through formatCurrency / toLocaleString('en-IN'), which
 * already produce the 2-2-3 Indian grouping (12,50,000).
 */
export function formatCompactINR(value: number): string {
  const sign = value < 0 ? '-' : ''
  const n = Math.abs(value)
  if (n >= CRORE) return `${sign}₹${(n / CRORE).toFixed(1)}Cr`
  if (n >= LAKH) return `${sign}₹${(n / LAKH).toFixed(1)}L`
  if (n >= 1000) return `${sign}₹${(n / 1000).toFixed(1)}k`
  return `${sign}₹${n.toFixed(0)}`
}

export function generateOrderNumber(orderId: string): string {
  return `KBS-${orderId.slice(0, 8).toUpperCase()}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getDiscountPercent(price: number, mrp: number): number {
  if (!mrp || mrp <= price) return 0
  return Math.round((1 - price / mrp) * 100)
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return phone
}

const CAT_CODES: Record<string, string> = {
  'edible-oil': 'OIL',
  'pulses-dal': 'PUL',
  'atta-flour': 'ATT',
  'spices-masala': 'SPI',
  'sugar-jaggery': 'SUG',
  'packaged-water': 'WAT',
}

export function generateSKU(categorySlug: string, sequence: number): string {
  const catCode = CAT_CODES[categorySlug] ?? 'GEN'
  const year = new Date().getFullYear()
  const seq = sequence.toString().padStart(4, '0')
  return `KBS-${catCode}-${year}-${seq}`
}
