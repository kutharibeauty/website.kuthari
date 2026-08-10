// Spices packaging model (hanger / pack). Shared by the product buy panel
// (client) and the order pricing route (server) so the two never disagree.

export type SpicePackaging = 'Hanger' | 'Pack'
export const HANGER: SpicePackaging = 'Hanger'
export const PACK: SpicePackaging = 'Pack'

interface SpiceConfig {
  units_per_hanger?: number | null
  hangers_per_pack?: number | null
}

/** A product is sold by hanger/pack when both counts are configured (> 0). */
export function isSpiceProduct(p: SpiceConfig): boolean {
  return (
    p.units_per_hanger != null && p.units_per_hanger > 0 &&
    p.hangers_per_pack != null && p.hangers_per_pack > 0
  )
}

/** Units contained in ONE hanger or ONE pack. */
export function unitsPerSelection(
  packaging: SpicePackaging,
  unitsPerHanger: number,
  hangersPerPack: number,
): number {
  return packaging === PACK ? unitsPerHanger * hangersPerPack : unitsPerHanger
}

/** Price of ONE hanger or ONE pack, given the per-hanger price. */
export function pricePerSelection(
  packaging: SpicePackaging,
  hangerPrice: number,
  hangersPerPack: number,
): number {
  return packaging === PACK ? hangerPrice * hangersPerPack : hangerPrice
}

/** Human label carrying the unit count, e.g. "Hanger · 10 units". */
export function spiceUnitLabel(
  packaging: SpicePackaging,
  unitsPerHanger: number,
  hangersPerPack: number,
): string {
  return `${packaging} · ${unitsPerSelection(packaging, unitsPerHanger, hangersPerPack)} units`
}
