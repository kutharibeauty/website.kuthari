export function normalizeIndianPhone(input: unknown): string | null {
  if (typeof input !== 'string') return null
  let digits = input.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length !== 10) return null
  if (!/^[6-9]\d{9}$/.test(digits)) return null
  return digits
}

export function isEmail(input: unknown): input is string {
  if (typeof input !== 'string') return false
  if (input.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
}

export function isPlaceholderEmail(input: unknown): boolean {
  return typeof input === 'string' && /@bcrtraders\.internal$/i.test(input)
}

const NAME_RE = /^[\p{L}\p{M}\s'.-]+$/u
export function isPersonName(input: unknown): input is string {
  if (typeof input !== 'string') return false
  if (input.length < 1 || input.length > 60) return false
  return NAME_RE.test(input)
}

const SAFE_NEXT_RE = /^\/[a-zA-Z0-9._~!$&'()*+,;=:@%/-]*$/
export function isSafeInternalPath(input: unknown): input is string {
  if (typeof input !== 'string') return false
  if (input.length > 512) return false
  if (input.startsWith('//')) return false
  return SAFE_NEXT_RE.test(input)
}
