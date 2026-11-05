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
          `buy ${name} online`,
          `${name} price`,
          `${name} online store`,
          `buy ${name} in bulk`,
        ]
      : []),
    ...MASTER_KEYWORDS.brand.slice(0, 4),
    ...MASTER_KEYWORDS.retail.slice(0, 5),
    ...MASTER_KEYWORDS.categories.slice(0, 4),
    ...MASTER_KEYWORDS.cities.slice(0, 6),
    ...MASTER_KEYWORDS.nearMe.slice(0, 4),
    ...MASTER_KEYWORDS.buyIntent.slice(0, 3),
  ])
}

/**
 * Keywords for a product page: the product's own words first (short forms like
 * "lotus facial kit", long forms like "buy lotus facial kit online at best
 * price in India"), then its tags, then the shared cosmetics pools.
 */
export function getProductKeywords(
  tags: string[] | null,
  categorySlug?: string,
  product?: { name?: string | null; brand?: string | null; unit?: string | null; categoryName?: string | null },
): string[] {
  const catName = (product?.categoryName ?? (categorySlug ? categorySlug.replace(/-/g, ' ') : '')).trim().toLowerCase()
  const name = (product?.name ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
  const brand = (product?.brand ?? '').trim().toLowerCase()
  const size = (product?.unit ?? '').trim().toLowerCase()
  const own = name
    ? [
        name,
        size && !name.includes(size) ? `${name} ${size}` : '',
        `${name} price`,
        `buy ${name} online`,
        `${name} online India`,
        `${name} price in India`,
        `${name} Brahmapur`,
        `${name} Odisha`,
        `${name} wholesale price`,
        `${name} bulk buy`,
        `original ${name}`,
        `buy ${name} online at best price in India`,
        `${name} with home delivery`,
      ]
    : []
  const brandWords = brand
    ? [brand, `${brand} products`, `${brand} online`, catName ? `${brand} ${catName}` : '', `${brand} products Brahmapur`]
    : []
  return uniq([
    ...own,
    ...brandWords,
    ...(tags ?? []).map((t) => t.toLowerCase()),
    ...(catName ? [catName, `buy ${catName} online`, `${catName} bulk order`, `${catName} shop Brahmapur`] : []),
    ...MASTER_KEYWORDS.brand.slice(0, 3),
    ...MASTER_KEYWORDS.retail.slice(0, 3),
    ...MASTER_KEYWORDS.cities.slice(0, 2),
    ...MASTER_KEYWORDS.buyIntent.slice(0, 2),
  ]).slice(0, 40)
}

/** Site-wide keywords for the homepage — the broadest coverage. */
export const HOMEPAGE_KEYWORDS: string[] = uniq([
  ...MASTER_KEYWORDS.brand,
  ...MASTER_KEYWORDS.retail,
  ...MASTER_KEYWORDS.categories,
  ...MASTER_KEYWORDS.bulk,
  ...MASTER_KEYWORDS.cities,
  ...MASTER_KEYWORDS.nearMe,
  ...MASTER_KEYWORDS.buyIntent,
  ...MASTER_KEYWORDS.questions,
  ...MASTER_KEYWORDS.longTail,
])

/** Keywords for the search / all-products page. */
export function getSearchKeywords(query?: string, categoryName?: string): string[] {
  return uniq([
    ...(query ? [query, `buy ${query} online`, `${query} price`, `buy ${query} in bulk`] : []),
    ...(categoryName ? [`buy ${categoryName} online`, `${categoryName} bulk order`] : []),
    ...MASTER_KEYWORDS.brand.slice(0, 4),
    ...MASTER_KEYWORDS.retail.slice(0, 6),
    ...MASTER_KEYWORDS.nearMe.slice(0, 4),
  ])
}
