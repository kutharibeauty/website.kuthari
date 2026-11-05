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
  /** The hero story and the shelf grid: featured products, or, when none are
   *  marked featured yet, the first active products that have a photo. */
  shelfProducts: Product[]
  /** True when shelfProducts are the admin's featured picks. */
  shelfIsFeatured: boolean
  coupons: Coupon[]
  categoryProducts: Record<string, Product[]>
  /** Active products per category id (the rows above are capped). */
  categoryCounts: Record<string, number>
  announcement: SiteAnnouncement | null
  offerBanner: OfferBannerConfig | null
  trustBadges: TrustBadgeItem[]
  marqueeLines: MarqueeLineItem[]
  /** Real reviews for the home page wall (see components/home/ReviewsWall). */
  reviews: import('@/components/home/ReviewsWall').WallReview[]
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
  const [bannersRes, categoriesRes, productsRes, couponsRes, cmsRes, reviewsRes] =
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
      // Approved reviews with words in them, newest first.
      supabase
        .from('reviews')
        .select('id, product_id, reviewer_name, rating, body, created_at')
        .eq('is_approved', true)
        .not('body', 'is', null)
        .order('created_at', { ascending: false })
        .limit(9),
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

  // Derived in memory, no extra queries. Featured keeps the admin's display_order.
  const featuredProducts = allProducts.filter((p) => p.is_featured).slice(0, 12)
  const withPhoto = (p: Product) => Array.isArray(p.images) && p.images.length > 0
  const shelfIsFeatured = featuredProducts.length > 0
  const shelfProducts = (shelfIsFeatured ? featuredProducts : allProducts).filter(withPhoto).slice(0, 12)

  const categoryProducts: Record<string, Product[]> = {}
  const categoryCounts: Record<string, number> = {}
  for (const cat of categories) {
    categoryProducts[cat.id] = []
    categoryCounts[cat.id] = 0
  }
  for (const p of allProducts) {
    if (!p.category_id || !(p.category_id in categoryProducts)) continue
    categoryCounts[p.category_id] += 1
    const bucket = categoryProducts[p.category_id]
    if (bucket.length < PER_CATEGORY_LIMIT) bucket.push(p)
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

  // Product reviews from this site, then reviews the shop copied in from
  // Google / Justdial (Banners & CMS → Homepage → Customer reviews).
  const productName = new Map(allProducts.map((p) => [p.id, { name: p.name, slug: p.slug }]))
  type RawReview = { id: string; product_id: string; reviewer_name: string; rating: number; body: string | null }
  const siteReviews = ((reviewsRes.data ?? []) as RawReview[])
    .filter((r) => (r.body ?? '').trim().length > 0)
    .map((r) => ({
      id: r.id,
      name: r.reviewer_name,
      text: (r.body ?? '').trim(),
      rating: Number(r.rating) || 5,
      source: productName.get(r.product_id)?.name ?? 'Verified purchase',
      href: productName.get(r.product_id) ? `/product/${productName.get(r.product_id)!.slug}` : undefined,
    }))
  const copied = Array.isArray(cmsMap['testimonials'])
    ? (cmsMap['testimonials'] as unknown[])
        .map((t, i) => {
          const o = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>
          return {
            id: `cms-${i}`,
            name: typeof o.name === 'string' ? o.name.trim() : '',
            text: typeof o.text === 'string' ? o.text.trim() : '',
            rating: Number(o.rating) || 5,
            source: typeof o.source === 'string' && o.source.trim() ? o.source.trim() : 'Google',
          }
        })
        .filter((t) => t.name && t.text)
    : []
  const reviews = [...siteReviews, ...copied]

  return {
    reviews,
    banners,
    promoCards,
    categories,
    featuredProducts,
    shelfProducts,
    shelfIsFeatured,
    coupons,
    categoryProducts,
    categoryCounts,
    announcement,
    offerBanner,
    trustBadges,
    marqueeLines,
  }
}
