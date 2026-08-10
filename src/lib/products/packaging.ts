// How a product may be bought.
//
// This is a RETAIL-first store, so the customer first picks Single piece or
// Bulk, and only then — if buying bulk — which bulk unit:
//
//   Single  -> retail_price / retail_mrp        (one piece)
//   Bulk    -> Box → (Hanger | Pack | Tin | Pouch)
//
//   pack_type            the biggest unit sold, e.g. "Box"
//   unit_type            the lower bulk unit a customer may also buy
//   units_per_pack       how many lower units are in one box      (e.g. 10)
//   pieces_per_secondary how many pieces are in one lower unit     (e.g. 10)
//
// Everest 200gm: 10 packs/box × 10 pieces/pack   =   100 pieces/box
// Small masala : 20 hangers/box × 60 pieces/hanger = 1,200 pieces/box
//
// Pure logic — no server imports, so both the product page (client) and the
// order route (server) use it and can never disagree on price or piece counts.

export interface PackagingProduct {
  pack_type?: string | null
  unit_type?: string | null
  units_per_pack?: number | null
  pieces_per_secondary?: number | null
  price: number
  mrp?: number | null
  secondary_price?: number | null
  secondary_mrp?: number | null
  // Spices (admin → "Spices — Hanger / Pack"): `price` is the price per HANGER
  // and the pack price is derived. Takes precedence over the box model below.
  units_per_hanger?: number | null
  hangers_per_pack?: number | null
  // Retail: a single-unit price offered alongside the bulk price above.
  // Null when the product is sold in bulk only.
  retail_price?: number | null
  retail_mrp?: number | null
}

export type BuyLevel = 'box' | 'secondary' | 'retail'

/** Cart-variant label for the retail option. Stored on the order line, so it
 *  must stay stable — changing it would orphan existing cart/order rows. */
export const RETAIL_LABEL = 'Retail'

/** True when the admin has given this product a retail price. */
export function hasRetailPrice(p: PackagingProduct): boolean {
  return p.retail_price != null && p.retail_price > 0
}

export interface BuyOption {
  level: BuyLevel
  /** Display + cart-variant label: "Retail", "Box", "Hanger", "Pack", "Tin". */
  label: string
  /** Plural form for quantity copy. Absent = pluralise `label` normally. */
  pluralLabel?: string
  /** What ONE of this option is called in running copy — "Price per piece",
   *  "Number of pieces". Defaults to `label`, which is right for Box/Pack/
   *  Hanger but wrong for the retail option, whose label is a price TIER
   *  ("Retail") rather than a unit. */
  unitNoun?: string
  unitNounPlural?: string
  /** Price for ONE of this unit. */
  price: number
  mrp: number | null
  /** Pieces contained in ONE of this unit; null when the admin hasn't set it. */
  pieces: number | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Spices configured via admin → "Spices — Hanger / Pack": the customer buys
 * hangers or packs, `price` is per HANGER, and the pack price is derived.
 */
export function isSpiceHangerPack(p: PackagingProduct): boolean {
  return (p.units_per_hanger ?? 0) > 0 && (p.hangers_per_pack ?? 0) > 0
}

/** True when the product has a smaller unit the customer can buy besides the box. */
export function hasSecondaryUnit(p: PackagingProduct): boolean {
  return !!p.unit_type && (p.units_per_pack ?? 0) > 1
}

/** Total pieces inside one box/pack — null until the admin fills the counts in. */
export function piecesPerBox(p: PackagingProduct): number | null {
  // Spices: the biggest unit is the Pack = hangers × units-per-hanger.
  if (isSpiceHangerPack(p)) {
    return (p.units_per_hanger as number) * (p.hangers_per_pack as number)
  }
  const per = p.units_per_pack ?? null
  const each = p.pieces_per_secondary ?? null
  if (!hasSecondaryUnit(p)) return each // Box → pieces directly
  if (per == null || each == null) return null
  return per * each
}

/**
 * The retail (single-unit) option, or null when the product is bulk-only.
 * Listed FIRST by getBuyOptions: this is a retail-first store, so a single
 * unit is the common purchase and should be the default selection.
 */
export function retailOption(p: PackagingProduct): BuyOption | null {
  if (!hasRetailPrice(p)) return null
  return {
    level: 'retail',
    // The cart/order variant key stays "Retail" — stable and distinct from any
    // pack_type — while the copy below calls it a piece.
    label: RETAIL_LABEL,
    pluralLabel: RETAIL_LABEL,
    unitNoun: 'piece',
    unitNounPlural: 'pieces',
    price: p.retail_price as number,
    mrp: p.retail_mrp ?? null,
    // A retail line is one unit — printing a piece count here would imply it
    // contains several.
    pieces: null,
  }
}

/**
 * The levels a customer may buy at: retail first (when priced), then the
 * bulk levels biggest-first. A product with no lower unit and no retail
 * price yields just the box/base option.
 */
export function getBuyOptions(p: PackagingProduct): BuyOption[] {
  const retail = retailOption(p)
  return retail ? [retail, ...bulkBuyOptions(p)] : bulkBuyOptions(p)
}

/**
 * The BULK levels only — the box/hanger/pack model. Always at least one entry,
 * since `price` (the bulk base price) is required on every product.
 */
export function bulkBuyOptions(p: PackagingProduct): BuyOption[] {
  // Spices — Box → Hanger → Piece. The customer buys a whole BOX or individual
  // HANGERS (never single pieces), and `price` is the price of ONE HANGER, so
  // the box price is derived: hangers-per-box × hanger price.
  // e.g. 60 pieces/hanger × 20 hangers/box at ₹220/hanger
  //      ->  1 Hanger = ₹220 · 60 pieces,  1 Box = ₹4,400 · 1,200 pieces.
  if (isSpiceHangerPack(p)) {
    const piecesPerHanger = p.units_per_hanger as number
    const hangersPerBox = p.hangers_per_pack as number
    // Honour the admin's own wording for the outer unit, but never let it be
    // "Hanger" or we'd render two identical options.
    const boxLabel = p.pack_type && p.pack_type !== 'Hanger' ? p.pack_type : 'Box'
    return [
      {
        level: 'secondary',
        label: 'Hanger',
        price: p.price,
        mrp: p.mrp ?? null,
        pieces: piecesPerHanger,
      },
      {
        level: 'box',
        label: boxLabel,
        price: round2(p.price * hangersPerBox),
        mrp: p.mrp != null ? round2(p.mrp * hangersPerBox) : null,
        pieces: piecesPerHanger * hangersPerBox,
      },
    ]
  }

  const boxLabel = p.pack_type || 'Box'
  const options: BuyOption[] = [
    { level: 'box', label: boxLabel, price: p.price, mrp: p.mrp ?? null, pieces: piecesPerBox(p) },
  ]

  if (hasSecondaryUnit(p)) {
    const per = p.units_per_pack as number
    // Fall back to an even split of the box price when the admin hasn't set a
    // dedicated price for the lower unit.
    const price = p.secondary_price ?? round2(p.price / per)
    const mrp = p.secondary_mrp ?? (p.mrp != null ? round2(p.mrp / per) : null)
    options.push({
      level: 'secondary',
      label: p.unit_type as string,
      price,
      mrp,
      pieces: p.pieces_per_secondary ?? null,
    })
  }

  return options
}

/** Look a buy option up by its label (what the cart/order stores as `variant`). */
export function findBuyOption(p: PackagingProduct, label: string | null | undefined): BuyOption | null {
  if (!label) return null
  return getBuyOptions(p).find((o) => o.label === label) ?? null
}

/** Plural form of a buy option's label, honouring an explicit `pluralLabel`.
 *  Handles the sibilant endings a naive +"s" gets wrong ("Box" -> "Boxes"). */
export function pluralLabelOf(opt: BuyOption): string {
  if (opt.pluralLabel) return opt.pluralLabel
  return /(?:s|x|z|ch|sh)$/i.test(opt.label) ? `${opt.label}es` : `${opt.label}s`
}

/** The noun for ONE of this option, for running copy. */
export function unitNounOf(opt: BuyOption): string {
  return opt.unitNoun ?? opt.label
}

/** The noun for MANY of this option, for running copy. */
export function unitNounPluralOf(opt: BuyOption): string {
  if (opt.unitNounPlural) return opt.unitNounPlural
  if (opt.unitNoun) return /(?:s|x|z|ch|sh)$/i.test(opt.unitNoun) ? `${opt.unitNoun}es` : `${opt.unitNoun}s`
  return pluralLabelOf(opt)
}

/** "3 Hangers = 180 Pieces" — the line shown to the customer. Uses the unit
 *  NOUN, so the retail option reads "1 piece" rather than "1 Retail". */
export function describeSelection(qty: number, opt: BuyOption, pieceWord = 'Pieces'): string {
  const unit = qty === 1 ? unitNounOf(opt) : unitNounPluralOf(opt)
  if (opt.pieces == null) return `${qty} ${unit}`
  return `${qty} ${unit} = ${(qty * opt.pieces).toLocaleString('en-IN')} ${pieceWord}`
}
