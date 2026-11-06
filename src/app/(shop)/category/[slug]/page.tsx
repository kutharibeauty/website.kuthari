import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getCategoryBySlug, getCategoryProducts } from '@/lib/data/category'
import { getCategoryKeywords } from '@/lib/seo/generator'
import ProductBreadcrumb from '@/components/product/ProductBreadcrumb'
import CategoryProductsSection from './CategoryProductsSection'
import CategoryStrip from '@/components/category/CategoryStrip'
import { safeJsonLd } from '@/lib/utils'
import { SITE_URL } from '@/lib/site-url'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string }>
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return { title: 'Category Not Found' }

  const title = `${category.name} — Buy Online | Kuthari Beauty Store`
  const description = `Shop ${category.name} at Kuthari Beauty Store — buy a single piece at retail price or order in bulk. Secure online payment and delivery across India.`
  const keywords = getCategoryKeywords(slug, category.name)
  const ogImage = category.image_url
    ? [{ url: category.image_url, width: 1200, height: 630, alt: category.name }]
    : [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Kuthari Beauty Store' }]

  return {
    title: { absolute: title },
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
      images: category.image_url ? [category.image_url] : ['/og-image.jpg'],
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

  const appUrl = SITE_URL

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
          name: `${category.name} — Kuthari Beauty Store`,
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

      {/* ── Category head: the aisle's name set huge on a periwinkle band ── */}
      <section className="w-full bg-periwinkle">
        <div className="mx-auto flex max-w-[1440px] items-end justify-between gap-6 px-5 md:px-10 py-12 md:py-16">
          <div className="min-w-0">
            <h1 className="display text-[length:var(--text-section)]">{category.name}</h1>
            <p className="accent-line mt-1 text-[calc(var(--text-section)*0.6)] text-indigo">
              {total} {total === 1 ? 'product' : 'products'} on the shelf.
            </p>
          </div>
          {category.image_url?.startsWith('/images/categories/') ? (
            <span
              aria-hidden="true"
              className="hidden sm:block h-28 w-28 md:h-40 md:w-40 shrink-0 bg-ink"
              style={{
                maskImage: `url(${category.image_url})`,
                WebkitMaskImage: `url(${category.image_url})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
            />
          ) : category.image_url ? (
            // An image the admin uploaded for this category (Categories → image).
            <span className="relative hidden sm:block h-32 w-32 md:h-44 md:w-44 shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-paper-raised">
              <Image src={category.image_url} alt="" fill sizes="176px" className="object-cover" />
            </span>
          ) : null}
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
          <h2 className="text-xl font-black text-primary tracking-tight mb-3">
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
