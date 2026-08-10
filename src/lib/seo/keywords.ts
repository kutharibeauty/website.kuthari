/**
 * SEO keyword pools for Kuthari Beauty Store.
 *
 * Generic cosmetics / salon / grooming terms. Once the client confirms the
 * exact brands and categories they stock, the `categories` group below should
 * be extended with brand names ("wholesale Lakme distributor", …) — those are
 * the highest-intent terms and can't be guessed.
 */
export const MASTER_KEYWORDS = {
  brand: [
    'KUTHARI BEAUTY STORE',
    'Kuthari Beauty Store online',
    'Kuthari Beauty Store Odisha',
    'Kuthari Beauty Store wholesale',
    'Kuthari Beauty Store Brahmapur',
    'Kuthari Beauty Store price list',
    'Kuthari Beauty Store bulk order',
    'Kuthari wholesale cosmetics distributor',
  ],

  wholesale: [
    'wholesale cosmetics distributor',
    'wholesale beauty products supplier',
    'cosmetics wholesale market online',
    'beauty products wholesale price list',
    'salon products wholesale supplier',
    'parlour products wholesale dealer',
    'bulk cosmetics supplier India',
    'B2B cosmetics supplier',
    'cosmetic distributor for retailers',
    'beauty wholesale online India',
    'salon supplies distributor',
    'grooming products wholesale',
    'cosmetics dealer near me',
    'wholesale makeup supplier India',
    'beauty store wholesale rates',
  ],

  categories: [
    'wholesale skincare products',
    'wholesale haircare products',
    'wholesale makeup products',
    'wholesale face wash bulk',
    'wholesale shampoo distributor',
    'wholesale hair oil supplier',
    'wholesale perfume dealer',
    'wholesale nail polish supplier',
    'wholesale hair colour distributor',
    'salon equipment wholesale',
    'beauty parlour items wholesale',
    'wholesale body lotion supplier',
    'wholesale soap and bath products',
    'wholesale mens grooming products',
    'wholesale cosmetics combo packs',
  ],

  cities: [
    'cosmetics wholesale Brahmapur',
    'beauty products wholesale Berhampur',
    'cosmetics distributor Odisha',
    'beauty wholesale Bhubaneswar',
    'cosmetics wholesale Cuttack',
    'beauty products supplier Andhra Pradesh',
    'cosmetics distributor West Bengal',
    'beauty wholesale Chhattisgarh',
  ],

  nearMe: [
    'cosmetics wholesaler near me',
    'beauty products wholesale near me',
    'salon supplies near me',
    'parlour products shop near me',
  ],

  buyIntent: [
    'buy cosmetics in bulk online',
    'order beauty products wholesale',
    'cosmetics bulk order online India',
    'beauty products for resale',
    'start a beauty business supplier',
  ],

  questions: [
    'where to buy cosmetics in bulk',
    'how to start a cosmetics retail shop',
    'best wholesale beauty distributor in Odisha',
    'minimum order for wholesale cosmetics',
  ],

  longTail: [
    'genuine branded cosmetics wholesale distributor',
    'cosmetics wholesale with home delivery',
    'beauty products wholesale all over India',
    'retail and wholesale cosmetics supplier',
    'salon and parlour product supplier Odisha',
  ],
} as const

export const ALL_KEYWORDS: string[] = Object.values(MASTER_KEYWORDS).flatMap((g) => [...g])
