import { MASTER_KEYWORDS } from './keywords'

// De-dupe while preserving order.
function uniq(list: string[]): string[] {
  return Array.from(new Set(list.filter(Boolean)))
}

/**
 * Keywords for a given category page.
 *
 * Categories are admin-created, so there is no fixed slug→keyword map any more
 * (the old one was hard-coded to BCR's six grocery categories). The category's
 * own name carries the specific intent; the shared pools supply the rest.
 */
export function getCategoryKeywords(slug: string, categoryName?: string): string[] {
  const name = (categoryName ?? slug.replace(/-/g, ' ')).trim()
  return uniq([
    ...(name
      ? [
          `wholesale ${name}`,
          `${name} wholesale price`,
          `buy ${name} in bulk`,
          `${name} distributor`,
        ]
      : []),
    ...MASTER_KEYWORDS.brand.slice(0, 4),
    ...MASTER_KEYWORDS.wholesale.slice(0, 5),
    ...MASTER_KEYWORDS.categories.slice(0, 4),
    ...MASTER_KEYWORDS.cities.slice(0, 6),
    ...MASTER_KEYWORDS.nearMe.slice(0, 4),
    ...MASTER_KEYWORDS.buyIntent.slice(0, 3),
  ])
}

/**
 * Keywords for a product page.
 * Uses the product's own tags first, then the shared cosmetics pools.
 */
export function getProductKeywords(tags: string[] | null, categorySlug?: string): string[] {
  const catName = categorySlug ? categorySlug.replace(/-/g, ' ') : ''
  return uniq([
    ...(tags ?? []),
    ...(catName ? [`wholesale ${catName}`, `${catName} bulk order`] : []),
    ...MASTER_KEYWORDS.brand.slice(0, 4),
    ...MASTER_KEYWORDS.wholesale.slice(0, 4),
    ...MASTER_KEYWORDS.categories.slice(0, 3),
    ...MASTER_KEYWORDS.cities.slice(0, 3),
    ...MASTER_KEYWORDS.buyIntent.slice(0, 3),
  ])
}

/** Site-wide keywords for the homepage — the broadest coverage. */
export const HOMEPAGE_KEYWORDS: string[] = uniq([
  ...MASTER_KEYWORDS.brand,
  ...MASTER_KEYWORDS.wholesale,
  ...MASTER_KEYWORDS.categories,
  ...MASTER_KEYWORDS.cities,
  ...MASTER_KEYWORDS.nearMe,
  ...MASTER_KEYWORDS.buyIntent,
  ...MASTER_KEYWORDS.questions,
  ...MASTER_KEYWORDS.longTail,
])

/** Keywords for the search / all-products page. */
export function getSearchKeywords(query?: string, categoryName?: string): string[] {
  return uniq([
    ...(query ? [query, `${query} wholesale`, `buy ${query} in bulk`, `${query} wholesale price`] : []),
    ...(categoryName ? [`${categoryName} wholesale`, `${categoryName} bulk order`] : []),
    ...MASTER_KEYWORDS.brand.slice(0, 4),
    ...MASTER_KEYWORDS.wholesale.slice(0, 6),
    ...MASTER_KEYWORDS.nearMe.slice(0, 4),
  ])
}
