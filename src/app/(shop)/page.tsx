import type { Metadata } from 'next'
import Link from 'next/link'
import { HOMEPAGE_KEYWORDS } from '@/lib/seo/generator'
import { getHomepageData } from '@/lib/data/homepage'
import HeroBanner from '@/components/home/HeroBanner'
import PromoCardsRow from '@/components/home/PromoCardsRow'
import TrustBadges from '@/components/home/TrustBadges'
import ProductSection from '@/components/home/ProductSection'
import OfferBanner from '@/components/home/OfferBanner'
import CouponCards from '@/components/home/CouponCards'
import CouponMarquee from '@/components/home/CouponMarquee'
import AnimatedStats from '@/components/home/AnimatedStats'
import CategoryStrip from '@/components/category/CategoryStrip'
import { safeJsonLd } from '@/lib/utils'
import { RETURN_POLICY_JSONLD } from '@/lib/seo/return-policy'

// TODO(Phase 2): replace with the real production domain once confirmed.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.kutharibeauty.com'

export const revalidate = 60

// TODO(Phase 2): HOMEPAGE_KEYWORDS / MASTER_KEYWORDS still list grocery/commodity
// terms — replace with real cosmetics/salon/grooming SEO keywords.
export const metadata: Metadata = {
  // `absolute` bypasses the "%s | KUTHARI BEAUTY STORE…" template so the tab/SERP
  // title leads with the brand exactly as requested.
  title: {
    absolute: 'KUTHARI BEAUTY STORE | Wholesale Cosmetics, Skincare, Haircare & Salon Supplies Distributor',
  },
  description:
    'KUTHARI BEAUTY STORE — a trusted wholesale distributor of cosmetics, skincare, haircare, makeup and salon/grooming products. Buy in bulk at the best wholesale prices. Secure online payment available.',
  keywords: HOMEPAGE_KEYWORDS,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'KUTHARI BEAUTY STORE — Wholesale Cosmetics & Salon Supplies Distributor',
    description:
      'Wholesale cosmetics platform. Skincare, Haircare, Makeup, Salon & Grooming products — bulk orders at best prices. Secure online payment.',
    url: '/',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KUTHARI BEAUTY STORE — Wholesale Cosmetics & Salon Supplies Distributor',
    description: 'Bulk skincare, haircare, makeup & salon supplies at wholesale prices. Secure online payment.',
    images: ['/og-image.jpg'],
  },
}

// TODO: no GPS coordinates were supplied for the new address, so the `geo`
// field below is omitted rather than guessed — add it once geocoded (the
// app already has /api/geocode, or use Google Maps to look the address up).
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'KUTHARI BEAUTY STORE',
  url: APP_URL,
  logo: `${APP_URL}/images/logo-trimmed.webp`,
  description:
    'A trusted wholesale distributor of cosmetics, skincare, haircare, makeup and salon/grooming products.',
  areaServed: [
    { '@type': 'State', name: 'Odisha' },
    { '@type': 'State', name: 'Andhra Pradesh' },
    { '@type': 'State', name: 'Chhattisgarh' },
    { '@type': 'State', name: 'West Bengal' },
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+91-9861235276',
      email: 'smortika@gmail.com',
      availableLanguage: ['English'],
    },
  ],
  sameAs: [
    'https://www.instagram.com/k_beauty_store923/',
  ],
  // Confirmed policy: no customer returns or exchanges. Same definition the
  // product offers emit, so the site states one policy from one source.
  hasMerchantReturnPolicy: RETURN_POLICY_JSONLD,
}

const localBizJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'HealthAndBeautyBusiness', 'Store'],
  name: 'KUTHARI BEAUTY STORE',
  '@id': APP_URL,
  url: APP_URL,
  image: `${APP_URL}/og-image.jpg`,
  logo: `${APP_URL}/images/logo-trimmed.webp`,
  priceRange: '₹₹',
  telephone: '+91-9861235276',
  email: 'smortika@gmail.com',
  currenciesAccepted: 'INR',
  paymentAccepted: 'UPI, Card, Netbanking',
  slogan: 'Trusted Wholesale Beauty Partner',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Marthapeta St, Sano Bazar, Back side of Ganesh Market',
    addressLocality: 'Brahmapur',
    addressRegion: 'Odisha',
    postalCode: '760009',
    addressCountry: 'IN',
  },
  areaServed: [
    { '@type': 'State', name: 'Odisha' },
    { '@type': 'State', name: 'Andhra Pradesh' },
    { '@type': 'State', name: 'Chhattisgarh' },
    { '@type': 'State', name: 'West Bengal' },
  ],
  knowsAbout: ['Skincare', 'Haircare', 'Makeup', 'Salon & Grooming Products', 'Wholesale Cosmetics'],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '18:00',
    },
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'KUTHARI BEAUTY STORE',
  url: APP_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${APP_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export default async function HomePage() {
  const { banners, promoCards, categories, featuredProducts, categoryProducts, coupons, offerBanner, trustBadges, marqueeLines } =
    await getHomepageData()

  return (
    <>
      {/* Organization JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }}
      />
      {/* LocalBusiness JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(localBizJsonLd) }}
      />
      {/* WebSite + SearchAction JSON-LD (sitelinks search box) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
      />

      {/* Soft gold glow behind the homepage content, replacing BCR Traders'
          Jagannath watermark. Decorative only: fixed, non-interactive, sits
          BELOW every card/section (z-0) so it just tints the ivory gaps. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 flex items-start justify-center overflow-hidden"
      >
        <div className="mt-24 h-[min(88vw,620px)] w-[min(88vw,620px)] radial-glow-gold" />
      </div>

      <div className="relative z-10 flex flex-col gap-6 py-4">
        {/* 1. Hero banner carousel */}
        <HeroBanner banners={banners} />

        {/* 2. Promo cards row */}
        <PromoCardsRow cards={promoCards} />

        {/* 3. Coupon marquee ticker — active coupons plus admin-authored lines */}
        {(coupons.length > 0 || marqueeLines.length > 0) && (
          <CouponMarquee coupons={coupons} customLines={marqueeLines} />
        )}

        {/* 4. Shop by category — Blinkit-style horizontal strip (editable images) */}
        <section className="pt-2">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-end justify-between">
            <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-primary">Shop by Category</h3>
            <Link href="/search" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary hover:text-primary/70 underline underline-offset-4 transition-colors">
              View All
            </Link>
          </div>
          <CategoryStrip categories={categories} mobileGrid />
        </section>

        {/* 5. Active coupon offers (premium coupon design) */}
        <CouponCards coupons={coupons} />

        {/* 6. Best Sellers */}
        <ProductSection
          title="Best Sellers"
          titleOr="ସବୁଠୁ ଅଧିକ ବିକ୍ରି"
          products={featuredProducts}
          viewAllHref="/search?featured=true"
        />

        {/* 7. Per-Category sections */}
        {categories.map((cat) => {
          const products = categoryProducts[cat.id] ?? []
          if (products.length === 0) return null
          return (
            <ProductSection
              key={cat.id}
              title={cat.name}
              titleOr={cat.name_or}
              products={products}
              viewAllHref={`/category/${cat.slug}`}
            />
          )
        })}

        {/* 8. Mid-page offer banner */}
        {offerBanner && <OfferBanner data={offerBanner} />}

        {/* 9. Trust badges (animated, scrollable) — CMS-driven */}
        <TrustBadges badges={trustBadges} />

        {/* 10. Business stats with counting animation */}
        <AnimatedStats />
      </div>

      {/* Floating WhatsApp order button */}
    </>
  )
}
