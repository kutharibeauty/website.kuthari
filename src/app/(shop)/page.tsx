import type { Metadata } from 'next'
import { HOMEPAGE_KEYWORDS } from '@/lib/seo/generator'
import { getHomepageData } from '@/lib/data/homepage'
import { getStoreContent } from '@/lib/data/store-content'
import HeroStory from '@/components/home/HeroStory'
import HeroBannerPanel from '@/components/home/HeroBannerPanel'
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
import { SITE_URL } from '@/lib/site-url'

const APP_URL = SITE_URL

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
    coupons, offerBanner, trustBadges, marqueeLines, reviews, aisles,
  } = await getHomepageData()
  const content = await getStoreContent()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(localBizJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }} />

      {/* 1. Hero: the admin's banners as a full-width carousel. The banners carry
          their own artwork and text, so the page heading is for screen readers
          and search engines only. */}
      <h1 className="sr-only">{content.hero.title} {content.hero.accent}</h1>
      <section className="mx-auto w-full max-w-[1440px] px-4 md:px-10 pt-4 md:pt-6" aria-label="Offers">
        {banners.length > 0 ? (
          <div className="relative w-full aspect-[5/2]">
            <HeroBannerPanel banners={banners} />
          </div>
        ) : (
          <div className="relative w-full h-[min(440px,82vw)]">
            <HeroStory products={shelfProducts} />
          </div>
        )}
      </section>

      {/* 2. The admin's promo cards, tucked straight under the hero with the same
          small gap the hero has under the header, so they read as one block. */}
      {promoCards.length > 0 && (
        <div className="pt-4 md:pt-6">
          <PromoCardsRow cards={promoCards} />
        </div>
      )}

      <div className={`flex flex-col gap-[var(--spacing-section)] ${promoCards.length > 0 ? 'pt-4 md:pt-6' : 'pt-[var(--spacing-section)]'}`}>
        {/* 3. The shelf grid with aisle filters. */}
        <ShelfGrid products={shelfProducts} categories={categories} featured={shelfIsFeatured} />

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
          title={aisles.title}
          accent={aisles.accent}
          // The admin's picture for a card (Banners & CMS → Homepage) wins; else a product photo from that aisle.
          covers={Object.fromEntries(
            categories.map((c) => [c.id, aisles.covers[c.id] ?? (categoryProducts[c.id] ?? []).find((p) => p.images?.[0])?.images?.[0] ?? null]),
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
