import { createClient } from '@/lib/supabase/server'
import type {
  Banner,
  Category,
  Product,
  Coupon,
  SiteAnnouncement,
  OfferBannerConfig,
} from '@/types/database.types'

export interface TrustBadgeItem {
  icon: string
  text: string
  text_or: string
}

/** A standalone line in the homepage coupon ticker (Banners & CMS → Announcements). */
export interface MarqueeLineItem {
  text: string
  text_or: string
}

export interface HomepageData {
  banners: Banner[]
  promoCards: Banner[]
  categories: Category[]
  featuredProducts: Product[]
  coupons: Coupon[]
  categoryProducts: Record<string, Product[]>
  announcement: SiteAnnouncement | null
  offerBanner: OfferBannerConfig | null
  trustBadges: TrustBadgeItem[]
  marqueeLines: MarqueeLineItem[]
}

function parseCmsValue<T>(
  value: unknown,
  validate: (v: Record<string, unknown>) => boolean
): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  return validate(v) ? (v as unknown as T) : null
}

/** Products shown per category row on the home page. */
const PER_CATEGORY_LIMIT = 8
/** Safety bound on the single product fetch (catalogue is ~200 rows). */
const MAX_ACTIVE_PRODUCTS = 1000

export async function getHomepageData(): Promise<HomepageData> {
  const supabase = await createClient()

  // ONE round trip. Previously this ran 5 queries, waited, then fired another
  // query per category (≈15 queries over 2 sequential round trips) — a
  // waterfall, because the per-category fetches needed the category ids first.
  // Fetching every active product once removes that dependency entirely; the
  // featured row and each category row are derived in memory below.
  const [bannersRes, categoriesRes, productsRes, couponsRes, cmsRes] =
    await Promise.all([
      supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      // NOTE: select('*') on purpose. The live schema has drifted from the
      // migrations, and naming a column that doesn't exist makes PostgREST fail
      // the WHOLE query — which silently emptied the categories (and every
      // category row) on the home page. Never enumerate columns against this DB.
      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .limit(MAX_ACTIVE_PRODUCTS),
      supabase.from('coupons').select('*').eq('is_active', true),
      supabase.from('cms_content').select('*'),
    ])

  const allBanners = bannersRes.data ?? []
  const banners = allBanners.filter((b) => b.placement === 'hero')
  const promoCards = allBanners.filter((b) => b.placement === 'mid_page').slice(0, 4)
  const categories = (categoriesRes.data ?? []) as unknown as Category[]
  const allProducts = (productsRes.data ?? []) as unknown as Product[]
  const coupons = couponsRes.data ?? []

  const cmsMap: Record<string, unknown> = {}
  ;(cmsRes.data ?? []).forEach((row) => {
    cmsMap[row.key] = row.value
  })

  // Derived in memory — no extra queries.
  // Best Sellers ordering: Ruchi first, then Fortune, then every other brand.
  // Sort runs before the slice so those brands surface even when their
  // display_order would have pushed them past the 12-item cut. Array.sort is
  // stable, so within each tier the existing display_order is preserved.
  const brandRank = (p: Product) => {
    const hay = `${p.name} ${p.brand ?? ''}`
    if (/ruchi/i.test(hay)) return 0
    if (/fortune/i.test(hay)) return 1
    return 2
  }
  const featuredProducts = allProducts
    .filter((p) => p.is_featured)
    .sort((a, b) => brandRank(a) - brandRank(b))
    .slice(0, 12)

  const categoryProducts: Record<string, Product[]> = {}
  for (const cat of categories) categoryProducts[cat.id] = []
  for (const p of allProducts) {
    const bucket = p.category_id ? categoryProducts[p.category_id] : undefined
    if (bucket && bucket.length < PER_CATEGORY_LIMIT) bucket.push(p)
  }

  const announcement = parseCmsValue<SiteAnnouncement>(
    cmsMap['site_announcement'],
    (v) => typeof v['text'] === 'string' && v['is_active'] === true
  )

  const offerBanner = parseCmsValue<OfferBannerConfig>(
    cmsMap['offer_banner'],
    (v) => typeof v['image_url'] === 'string'
  )

  // Trust badges are authored in Banners & CMS → Homepage as an array of
  // { icon, text, text_or }. Keep only entries that actually have label text.
  const trustBadges: TrustBadgeItem[] = Array.isArray(cmsMap['trust_badges'])
    ? (cmsMap['trust_badges'] as unknown[])
        .filter(
          (b): b is TrustBadgeItem =>
            !!b && typeof b === 'object' && typeof (b as TrustBadgeItem).text === 'string'
        )
        .map((b) => ({
          icon: typeof b.icon === 'string' ? b.icon : 'star',
          text: b.text,
          text_or: typeof b.text_or === 'string' ? b.text_or : '',
        }))
        .filter((b) => b.text.trim().length > 0)
    : []

  // Standalone ticker lines authored in Banners & CMS → Announcements as an
  // array of { text, text_or }. Keep only entries with actual English text.
  const marqueeLines: MarqueeLineItem[] = Array.isArray(cmsMap['marquee_lines'])
    ? (cmsMap['marquee_lines'] as unknown[])
        .filter(
          (l): l is MarqueeLineItem =>
            !!l && typeof l === 'object' && typeof (l as MarqueeLineItem).text === 'string'
        )
        .map((l) => ({ text: l.text, text_or: typeof l.text_or === 'string' ? l.text_or : '' }))
        .filter((l) => l.text.trim().length > 0)
    : []

  return {
    banners,
    promoCards,
    categories,
    featuredProducts,
    coupons,
    categoryProducts,
    announcement,
    offerBanner,
    trustBadges,
    marqueeLines,
  }
}
