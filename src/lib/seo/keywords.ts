/**
 * SEO keyword pools for Kuthari Beauty Store.
 *
 * Retail-first, matching how the store actually sells: single pieces at retail
 * price, with bulk (box/pack) as an option. The `bulk` group is deliberately
 * kept — buying by the box is a real offer and those are high-intent searches —
 * but it no longer leads.
 *
 * Brand terms convert best; `brands` lists the brands on the shelf today.
 */
export const MASTER_KEYWORDS = {
  brand: [
    'KUTHARI BEAUTY STORE',
    'Kuthari Beauty Store online',
    'Kuthari Beauty Store Odisha',
    'Kuthari Beauty Store Brahmapur',
    'Kuthari Beauty Store price list',
    'Kuthari beauty products',
    'Kuthari cosmetics shop',
  ],

  brands: [
    'Lotus Herbals facial kit online',
    'Nisha hair colour online',
    'VMAT shaving foam',
    'Ossion salon products',
    'Aryanveda de tan',
    'Ozone facial cleanser',
  ],

  retail: [
    'buy cosmetics online',
    'beauty products online store',
    'buy skincare online India',
    'order makeup online',
    'cosmetics shop online India',
    'beauty store near me',
    'buy beauty products with home delivery',
    'genuine branded cosmetics online',
    'affordable beauty products online',
    'cosmetics home delivery India',
  ],

  categories: [
    'buy skincare products',
    'buy haircare products',
    'buy makeup online',
    'face wash online',
    'shampoo online store',
    'hair oil online',
    'perfume and deodorant online',
    'nail polish online',
    'hair colour online',
    'salon products online',
    'beauty parlour items online',
    'body lotion online',
    'soap and bath products online',
    'mens grooming products online',
    'beauty combo packs online',
  ],

  // Bulk buying is still offered — box/pack rates for shops, salons and parlours.
  bulk: [
    'buy cosmetics in bulk online',
    'bulk beauty products supplier',
    'cosmetics box pack rate',
    'salon products bulk order',
    'parlour products bulk supplier',
    'beauty products for resale',
    'cosmetics distributor for retailers',
    'wholesale cosmetics supplier India',
  ],

  cities: [
    'cosmetics shop Brahmapur',
    'beauty products Berhampur',
    'cosmetics store Odisha',
    'beauty products Bhubaneswar',
    'cosmetics shop Cuttack',
    'beauty products Andhra Pradesh',
    'cosmetics store West Bengal',
    'beauty products Chhattisgarh',
  ],

  nearMe: [
    'cosmetics shop near me',
    'beauty products near me',
    'salon supplies near me',
    'parlour products shop near me',
  ],

  buyIntent: [
    'order beauty products online',
    'buy cosmetics with free delivery',
    'best online beauty store India',
    'beauty products delivered to home',
    'buy single piece or full box cosmetics',
  ],

  questions: [
    'where to buy genuine cosmetics online',
    'best beauty store in Odisha',
    'do you deliver cosmetics all over India',
    'minimum order for bulk cosmetics',
  ],

  longTail: [
    'genuine branded cosmetics with home delivery',
    'beauty products delivered all over India',
    'retail and bulk cosmetics store',
    'salon and parlour product supplier Odisha',
    'buy one piece or a full box of cosmetics',
  ],
} as const

export const ALL_KEYWORDS: string[] = Object.values(MASTER_KEYWORDS).flatMap((g) => [...g])
