/**
 * SKU category codes — the single source of truth.
 *
 * Shared by the admin form's "Auto" button (client) and the products API's
 * auto-generation when a SKU is omitted (server). They used to derive the
 * segment differently — the form took the first three letters of the category
 * name ("Skincare" -> SKI) while the server used a lookup (-> SKN) — so the
 * same product could get either prefix depending on how it was created.
 *
 * Keys MUST match the category slugs seeded in
 * supabase/migrations/037_seed_categories.sql. An unlisted slug falls back to
 * `FALLBACK_CAT_CODE`.
 */
export const CAT_CODES: Record<string, string> = {
  'skincare':              'SKN',
  'haircare':              'HAR',
  'hair-colour':           'CLR',
  'makeup':                'MKP',
  'nail-care':             'NAL',
  'fragrances-deodorants': 'FRG',
  'mens-grooming':         'MEN',
  'bath-body':             'BTH',
  'salon-parlour':         'SLN',
  'beauty-tools':          'TLS',
  'baby-kids-care':        'BBY',
}

export const FALLBACK_CAT_CODE = 'GEN'

/** The SKU segment for a category slug. */
export function catCodeForSlug(slug: string | null | undefined): string {
  return CAT_CODES[slug ?? ''] ?? FALLBACK_CAT_CODE
}

/** "KBS-SKN-2026-" — everything before the sequence number. */
export function skuPrefix(slug: string | null | undefined, year = new Date().getFullYear()): string {
  return `KBS-${catCodeForSlug(slug)}-${year}-`
}
