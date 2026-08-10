import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getCategoryBySlug, getCategoryProducts } from '@/lib/data/category'
import { getCategoryKeywords } from '@/lib/seo/generator'
import ProductBreadcrumb from '@/components/product/ProductBreadcrumb'
import CategoryProductsSection from './CategoryProductsSection'
import CategoryStrip from '@/components/category/CategoryStrip'
import { safeJsonLd } from '@/lib/utils'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string }>
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return { title: 'Category Not Found' }

  const title = `${category.name} Wholesale Price — Bulk Order | Kuthari Beauty Store`
  const description = `Buy ${category.name} in bulk at Kuthari Beauty Store — best wholesale prices with secure online payment and fast delivery. Shop our full range of ${category.name.toLowerCase()} at wholesale rates.`
  const keywords = getCategoryKeywords(slug)
  const ogImage = category.image_url
    ? [{ url: category.image_url, width: 1200, height: 630, alt: category.name }]
    : [{ url: '/images/og-default.jpg', width: 1200, height: 630 }]

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      title,
      description,
      url: `/category/${slug}`,
      images: ogImage,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: category.image_url ? [category.image_url] : ['/images/og-default.jpg'],
    },
  }
}

// ── Static params (build-time pre-rendering) ──────────────────────────────────

export async function generateStaticParams() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('categories')
      .select('slug')
      .eq('is_active', true)
    return ((data ?? []) as Array<{ slug: string }>).map((c) => ({ slug: c.slug }))
  } catch {
    return []
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const { products, total } = await getCategoryProducts({
    categoryId: category.id,
    sort: 'featured',
    page: 1,
  })

  // All active categories for the Blinkit-style top strip / switcher.
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, name, name_or, slug, image_url')
    .eq('is_active', true)
    .order('display_order')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.kutharibeauty.com'

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: appUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: category.name,
        item: `${appUrl}/category/${slug}`,
      },
    ],
  }

  const itemListJsonLd =
    products.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `${category.name} — Wholesale Products in Odisha`,
          numberOfItems: products.length,
          itemListElement: products.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${appUrl}/product/${p.slug}`,
            name: p.name,
          })),
        }
      : null

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
        />
      )}

      {/* ── Category Banner ── */}
      <section className="relative w-full h-[200px] md:h-[280px] bg-primary overflow-hidden">
        {/* Dot texture */}
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none z-10" />

        {/* Ambient orb */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/5 rounded-full blur-[70px] pointer-events-none z-10" />
        <div className="absolute -bottom-24 -left-16 w-64 h-64 bg-white/4 rounded-full blur-[60px] pointer-events-none z-10" />

        {/* Background image */}
        {category.image_url ? (
          <Image
            src={category.image_url}
            alt={category.name}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-20 mix-blend-luminosity"
          />
        ) : null}

        {/* Rich gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/60 z-10" />

        {/* Content */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end px-5 md:px-10 lg:px-16 pb-7 md:pb-10 max-w-7xl mx-auto">
          <span className="inline-block text-[9px] font-black uppercase tracking-[0.22em] text-white/40 border border-white/15 px-3 py-1.5 rounded-full w-max mb-3">
            Category
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.08]">
            {category.name}
          </h1>
        </div>
      </section>

      {/* ── Breadcrumb ── */}
      <div className="max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8">
        <ProductBreadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: category.name, labelOr: category.name_or ?? undefined },
          ]}
        />
      </div>

      {/* ── Category switcher strip (Blinkit-style, editable images) ── */}
      <CategoryStrip
        categories={(allCategories ?? []) as Array<{ id: string; name: string; name_or: string | null; slug: string; image_url: string | null }>}
        activeSlug={slug}
      />

      {/* ── Sort / Filter / Grid (Client) ── */}
      <CategoryProductsSection
        categoryId={category.id}
        initialProducts={products}
        initialTotal={total}
      />

      {/* ── SEO description ── */}
      <section className="mt-8 border-t border-table-border bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-table-border" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
              About
            </span>
            <div className="h-px flex-1 bg-table-border" />
          </div>
          <h2 className="text-xl font-black text-primary tracking-tight uppercase mb-3">
            {category.name}
          </h2>
          <p className="text-sm font-medium text-on-surface-variant/80 max-w-3xl leading-relaxed">
            Discover our curated selection of <strong className="text-primary font-black">{category.name}</strong> products at Kuthari
            Beauty Store. We source only the finest quality{' '}{category.name.toLowerCase()}{' '}items directly
            from trusted suppliers, ensuring authenticity and value with every order. Whether you&apos;re
            stocking your salon or shopping for your business, our {category.name.toLowerCase()}{' '}
            collection is carefully picked to meet your everyday needs — at prices that make sense.
          </p>
        </div>
      </section>
    </>
  )
}
