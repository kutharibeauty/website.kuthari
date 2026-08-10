// Shared GSTIN (Goods & Services Tax Identification Number) validation.
// Format: 15 chars — 2-digit state code, 5-letter + 4-digit PAN block, 1 PAN
// letter, 1 entity char, fixed 'Z', 1 checksum char. e.g. 21GBUPR9356D1Z3.
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/

/** Normalise then test a GSTIN. Returns the cleaned value or null if invalid. */
export function cleanGstin(raw: string | null | undefined): string | null {
  const v = (raw ?? '').toUpperCase().replace(/\s/g, '')
  return GSTIN_REGEX.test(v) ? v : null
}

export function isValidGstin(raw: string | null | undefined): boolean {
  return cleanGstin(raw) !== null
}
