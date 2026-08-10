import { MASTER_KEYWORDS } from './keywords'

// Category slug → keyword group
const CAT_KEYWORDS: Record<string, string[]> = {
  'edible-oil':     MASTER_KEYWORDS.oil,
  'pulses-dal':     MASTER_KEYWORDS.pulses,
  'atta-flour':     MASTER_KEYWORDS.atta,
  'spices-masala':  MASTER_KEYWORDS.spices,
  'sugar-jaggery':  MASTER_KEYWORDS.sugar,
  'packaged-water': MASTER_KEYWORDS.water,
}

// De-dupe while preserving order.
function uniq(list: string[]): string[] {
  return Array.from(new Set(list.filter(Boolean)))
}

/** Keywords for a given category page — category-specific + local + brand + core wholesale terms. */
export function getCategoryKeywords(slug: string): string[] {
  return uniq([
    ...(CAT_KEYWORDS[slug] ?? []),
    ...MASTER_KEYWORDS.brand.slice(0, 4),
    ...MASTER_KEYWORDS.wholesale.slice(0, 5),
    ...MASTER_KEYWORDS.cities.slice(0, 6),
    ...MASTER_KEYWORDS.nearMe.slice(0, 4),
    ...MASTER_KEYWORDS.buyIntent.slice(0, 3),
  ])
}

/**
 * Keywords for a product page.
 * Uses the product's own tags first, then category-specific keywords, then
 * local + brand + intent terms.
 */
export function getProductKeywords(tags: string[] | null, categorySlug?: string): string[] {
  const catKw = categorySlug ? (CAT_KEYWORDS[categorySlug] ?? []).slice(0, 8) : []
  return uniq([
    ...(tags ?? []),
    ...catKw,
    ...MASTER_KEYWORDS.brand.slice(0, 4),
    ...MASTER_KEYWORDS.wholesale.slice(0, 4),
    ...MASTER_KEYWORDS.cities.slice(0, 3),
    ...MASTER_KEYWORDS.buyIntent.slice(0, 3),
  ])
}

/** Site-wide keywords for the homepage — the broadest coverage. */
export const HOMEPAGE_KEYWORDS: string[] = uniq([
  ...MASTER_KEYWORDS.brand,
  ...MASTER_KEYWORDS.wholesale,
  ...MASTER_KEYWORDS.cities,
  ...MASTER_KEYWORDS.nearMe,
  ...MASTER_KEYWORDS.oil.slice(0, 4),
  ...MASTER_KEYWORDS.pulses.slice(0, 4),
  ...MASTER_KEYWORDS.atta.slice(0, 3),
  ...MASTER_KEYWORDS.spices.slice(0, 4),
  ...MASTER_KEYWORDS.sugar.slice(0, 3),
  ...MASTER_KEYWORDS.water.slice(0, 3),
  ...MASTER_KEYWORDS.buyIntent,
  ...MASTER_KEYWORDS.questions,
  ...MASTER_KEYWORDS.longTail,
])

/** Keywords for the search / all-products page. */
export function getSearchKeywords(query?: string, categoryName?: string): string[] {
  return uniq([
    ...(query ? [query, `${query} wholesale Odisha`, `buy ${query} bulk Odisha`, `${query} wholesale price`] : []),
    ...(categoryName ? [`${categoryName} wholesale Odisha`, `${categoryName} bulk order`] : []),
    ...MASTER_KEYWORDS.brand.slice(0, 4),
    ...MASTER_KEYWORDS.wholesale.slice(0, 6),
    ...MASTER_KEYWORDS.nearMe.slice(0, 4),
  ])
}
