'use client'

/**
 * The delivery pincode the customer last checked, persisted in localStorage.
 *
 * Shared so the header picker and the cart's delivery estimate read the same
 * entry — otherwise the cart would show the default rate while the header shows
 * the real one for the chosen pincode.
 *
 * Checkout does NOT read this: it re-checks the pincode of the actually
 * selected address, and the order route recomputes the charge server-side.
 */
export interface SavedPincodeResult {
  serviceable: boolean
  area?: string | null
  city?: string | null
  state?: string | null
  /** Admin-set rate. null/absent = none on file, so the default rate applies. */
  delivery_charge?: number | null
}

export interface SavedPincode {
  pincode: string
  result: SavedPincodeResult
}

export const PINCODE_STORAGE_KEY = 'kbs_pincode'

/** Older builds stored the same shape under a BCR-era key. Read it once so a
 *  returning customer doesn't lose their saved pincode on this deploy. */
const LEGACY_KEYS = ['bcr_pincode']

export function readSavedPincode(): SavedPincode | null {
  if (typeof window === 'undefined') return null
  for (const key of [PINCODE_STORAGE_KEY, ...LEGACY_KEYS]) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as SavedPincode
      if (!parsed?.pincode) continue
      // Migrate a legacy entry forward so this fallback stops being needed.
      if (key !== PINCODE_STORAGE_KEY) {
        try {
          localStorage.setItem(PINCODE_STORAGE_KEY, raw)
          localStorage.removeItem(key)
        } catch {}
      }
      return parsed
    } catch {}
  }
  return null
}

export function writeSavedPincode(entry: SavedPincode): void {
  try { localStorage.setItem(PINCODE_STORAGE_KEY, JSON.stringify(entry)) } catch {}
}

export function clearSavedPincode(): void {
  try {
    localStorage.removeItem(PINCODE_STORAGE_KEY)
    for (const k of LEGACY_KEYS) localStorage.removeItem(k)
  } catch {}
}
