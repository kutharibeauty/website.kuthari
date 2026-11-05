import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HOMEPAGE_KEYWORDS } from '@/lib/seo/generator'
import { getHomepageData } from '@/lib/data/homepage'
import { getStoreContent } from '@/lib/data/store-content'
import HeroStory from '@/components/home/HeroStory'
import HeroBannerPanel from '@/components/home/HeroBannerPanel'
import CategoryMarquee from '@/components/home/CategoryMarquee'
import ShelfGrid from '@/components/home/ShelfGrid'
import PromoCardsRow from '@/components/home/PromoCardsRow'
import CouponCards from '@/components/home/CouponCards'
import CouponMarquee from '@/components/home/CouponMarquee'
import CategoryBento from '@/components/home/CategoryBento'
import ProductSection from '@/components/home/ProductSection'
import OfferBanner from '@/components/home/OfferBanner'
import CounterSection from '@/components/home/CounterSection'
import ReviewsWall from '@/components/home/ReviewsWall'
import { safeJsonLd } from '@/lib/utils'
import { RETURN_POLICY_JSONLD } from '@/lib/seo/return-policy'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.kutharibeauty.com'

export const revalidate = 60

export const metadata: Metadata = {
  // `absolute` bypasses the "%s | KUTHARI BEAUTY STORE…" template so the tab/SERP
  // title leads with the brand exactly as requested.
  title: {
    absolute: 'KUTHARI BEAUTY STORE | Buy Cosmetics, Skincare, Haircare & Salon Products Online',
  },
  description:
    'KUTHARI BEAUTY STORE — your trusted beauty store for cosmetics, skincare, haircare, makeup and salon/grooming products. Buy a single piece at retail price, or order in bulk. Secure online payment, delivery across India.',
  keywords: HOMEPAGE_KEYWORDS,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'KUTHARI BEAUTY STORE — Cosmetics, Skincare & Salon Products Online',
    description:
      'Skincare, Haircare, Makeup, Salon & Grooming products. Buy single pieces at retail price or order in bulk. Secure online payment.',
    url: '/',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KUTHARI BEAUTY STORE — Cosmetics, Skincare & Salon Products Online',
    description: 'Skincare, haircare, makeup & salon products. Retail or bulk. Secure online payment.',
    images: ['/og-image.jpg'],
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'KUTHARI BEAUTY STORE',
  url: APP_URL,
  logo: `${APP_URL}/images/logo-trimmed.webp`,
  description:
    'A trusted beauty store for cosmetics, skincare, haircare, makeup and salon/grooming products — sold retail and in bulk.',
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
  // No change-of-mind returns (damaged items are replaced). Same definition the
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
  slogan: 'Your Trusted Beauty Store',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Marthapeta St, near Sano Bazar, Triveni Nagar',
    addressLocality: 'Brahmapur',
    addressRegion: 'Odisha',
    postalCode: '760009',
    addressCountry: 'IN',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 19.316888, longitude: 84.7796813 },
  hasMap: 'https://www.google.com/maps/place/Kuthari+Fancy+Store/@19.316888,84.7796813,17z',
  sameAs: [
    'https://www.justdial.com/Berhampur-Odisha/Kuthari-Fancy-Store-Near-Sano-Bazar-Nabeen/9999PX680-X680-171202172827-T1A7_BZDET',
    'https://www.indiamart.com/kothari-fency-store/',
  ],
  areaServed: [
    { '@type': 'State', name: 'Odisha' },
    { '@type': 'State', name: 'Andhra Pradesh' },
    { '@type': 'State', name: 'Chhattisgarh' },
    { '@type': 'State', name: 'West Bengal' },
  ],
  knowsAbout: ['Skincare', 'Haircare', 'Makeup', 'Salon & Grooming Products', 'Cosmetics'],
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
  const {
    banners, promoCards, categories, shelfProducts, shelfIsFeatured, categoryProducts, categoryCounts,
    coupons, offerBanner, trustBadges, marqueeLines, reviews,
  } = await getHomepageData()
  const content = await getStoreContent()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(localBizJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }} />

      {/* 1. Hero: the head and the buy action left, the shelf story right. */}
      <section className="mx-auto w-full max-w-[1440px] px-5 md:px-10 pt-6 md:pt-8 pb-10 md:pb-14">
        <div className="grid gap-8 lg:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:h-[min(640px,calc(100svh-150px))] lg:min-h-[540px]">
          <div className="flex flex-col justify-center min-w-0 py-2 lg:py-6">
            <h1 className="min-w-0">
              <span className="display block text-[length:var(--text-hero)]">{content.hero.title}</span>
              <span className="accent-line block mt-1 text-[calc(var(--text-hero)*0.8)]">{content.hero.accent}</span>
            </h1>
            <p className="mt-6 max-w-[34ch] text-[18px] md:text-[20px] leading-relaxed text-ink/80">
              {content.hero.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="#shelf-head" className="btn-pill group/cta">
                Shop the shelf
                <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" className="transition-transform group-hover/cta:translate-x-1" />
              </Link>
              <p className="text-[15px] leading-snug text-muted">
                One piece at retail price.
                <br />
                A box at bulk price.
              </p>
            </div>
          </div>
          {/* The admin's hero banners; the product story stands in when there are none. */}
          <div className="relative min-w-0 h-[min(440px,82vw)] lg:h-full">
            {banners.length > 0 ? <HeroBannerPanel banners={banners} /> : <HeroStory products={shelfProducts} />}
          </div>
        </div>
      </section>

      {/* 2. Every aisle, rolling past. */}
      <CategoryMarquee categories={categories} />

      <div className="flex flex-col gap-[var(--spacing-section)] pt-[var(--spacing-section)]">
        {/* 3. The shelf grid with aisle filters. */}
        <ShelfGrid products={shelfProducts} categories={categories} featured={shelfIsFeatured} />

        {/* 4. The admin's mid-page promo cards. */}
        {promoCards.length > 0 && <PromoCardsRow cards={promoCards} />}

        {/* 5. Live coupons, when there are any. */}
        {(coupons.length > 0 || marqueeLines.length > 0) && (
          <div className="flex flex-col gap-10">
            <CouponMarquee coupons={coupons} customLines={marqueeLines} />
            <CouponCards coupons={coupons} />
          </div>
        )}

        {/* 6. Every aisle as a tile, with real counts. */}
        <CategoryBento
          categories={categories}
          counts={categoryCounts}
          covers={Object.fromEntries(
            categories.map((c) => [c.id, (categoryProducts[c.id] ?? []).find((p) => p.images?.[0])?.images?.[0] ?? null]),
          )}
        />

        {/* 7. Each stocked aisle as a sideways shelf. */}
        {categories.map((cat) => {
          const products = categoryProducts[cat.id] ?? []
          if (products.length === 0) return null
          return (
            <ProductSection
              key={cat.id}
              title={cat.name}
              titleOr={cat.name_or}
              products={products}
              total={categoryCounts[cat.id]}
              viewAllHref={`/category/${cat.slug}`}
            />
          )
        })}

        {/* 8. The mid-page offer image. */}
        {offerBanner && <OfferBanner data={offerBanner} />}

        {/* 9. The ink band: the store's years and promises. */}
        <CounterSection badges={trustBadges} stats={content.stats} />

        {/* 10. Real customer reviews, or where to read them. */}
        <ReviewsWall reviews={reviews} />
      </div>
    </>
  )
}
