/**
 * How an order line reads on the invoice and in emails.
 *
 * The order stores the buying unit in `unit`, in one of these forms:
 *   "Retail"            single pieces at the retail price
 *   "Box · 12 pieces"   wholesale, by a pack of known size
 *   "Box"               wholesale, pack size not set
 *   "500g", "1 l"…      older orders: the product's size, not a buying unit
 *
 * Turned into a price type ("Retail price" / "Wholesale price") and a quantity
 * with a proper unit ("10 pcs", "2 Boxes" + "12 pcs each"), instead of
 * pluralising the raw text ("10 Retails").
 */
export interface LineTerms {
  /** "Retail price" | "Wholesale price" | null (older orders). */
  priceType: string | null
  /** Quantity with its unit: "10 pcs", "2 Boxes", "1 Box". */
  qty: string
  /** Extra detail under the quantity, e.g. "12 pcs each". */
  qtyNote: string | null
  /** A size from older orders ("500g"), shown with the item name. */
  size: string | null
  /** What one unit of the rate is: "pc", "Box". */
  per: string
}

const PACK_WORDS = /^(box|boxes|pack|packs|hanger|hangers|tin|tins|carton|cartons|case|cases|dozen|bundle|jar|strip|set|tray|packet)$/i

function plural(word: string, n: number): string {
  if (n === 1) return word
  if (/s$/i.test(word)) return word
  return /(x|ch|sh)$/i.test(word) ? `${word}es` : `${word}s`
}

export function lineTerms(quantity: number, unit: string | null | undefined): LineTerms {
  const raw = (unit ?? '').trim()
  const n = Number(quantity) || 0

  if (!raw || /^retail$/i.test(raw)) {
    return { priceType: raw ? 'Retail price' : null, qty: `${n} ${n === 1 ? 'pc' : 'pcs'}`, qtyNote: null, size: null, per: 'pc' }
  }

  const [label, detail] = raw.split('·').map((s) => s.trim())
  const pieces = detail ? Number((detail.match(/\d+/) ?? [])[0]) : NaN

  if (detail || PACK_WORDS.test(label)) {
    return {
      priceType: 'Wholesale price',
      qty: `${n} ${plural(label, n)}`,
      qtyNote: Number.isFinite(pieces) && pieces > 0 ? `${pieces} pcs each` : null,
      size: null,
      per: label,
    }
  }

  // Older orders kept the product's size here; it describes the item, not the count.
  return { priceType: null, qty: `${n} ${n === 1 ? 'pc' : 'pcs'}`, qtyNote: null, size: raw, per: 'pc' }
}
