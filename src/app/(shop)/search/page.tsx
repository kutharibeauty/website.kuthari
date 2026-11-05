import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/product/ProductCard'
import SearchControls from '@/components/search/SearchControls'
import type { Product, Category } from '@/types/database.types'
import { PackageSearch, Sparkles, TrendingUp, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import { getSearchKeywords } from '@/lib/seo/generator'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; featured?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams
  const title = q
    ? `${q} | Kuthari Beauty Store`
    : 'Shop Cosmetics — Skincare, Haircare, Makeup & Salon Products | Kuthari Beauty Store'
  const description = q
    ? `Buy ${q} online — single piece or bulk, with secure online payment and fast delivery from Kuthari Beauty Store.`
    : 'Shop skincare, haircare, makeup, salon and grooming products. Buy a single piece at retail price or order in bulk — Kuthari Beauty Store.'
  return {
    title,
    description,
    keywords: getSearchKeywords(q),
    alternates: { canonical: q ? `/search?q=${encodeURIComponent(q)}` : '/search' },
    openGraph: { title, description, url: '/search', images: [{ url: '/og-image.jpg', width: 1200, height: 630 }] },
  }
}

async function getSearchData(q: string, category: string, featured: boolean) {
  const supabase = await createClient()
  const db = supabase as any

  // select('*') on purpose — the live schema has drifted; naming a column that
  // doesn't exist fails the whole query and empties the results.
  let productQuery = db
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
    .limit(60)

  if (q) {
    productQuery = productQuery.or(
      `name.ilike.%${q}%,description.ilike.%${q}%,short_desc.ilike.%${q}%`
    )
  }

  if (category) {
    const { data: cat } = await db
      .from('categories')
      .select('id')
      .eq('slug', category)
      .eq('is_active', true)
      .maybeSingle()
    if (cat?.id) productQuery = productQuery.eq('category_id', cat.id)
  }

  if (featured) {
    productQuery = productQuery.eq('is_featured', true)
  }

  const [{ data: products }, { data: categories }] = await Promise.all([
    productQuery,
    db.from('categories').select('*').eq('is_active', true).order('display_order'),
  ])

  return {
    products: (products ?? []) as Product[],
    categories: (categories ?? []) as Category[],
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', category = '', featured } = await searchParams
  const isFeatured = featured === 'true'

  const { products, categories } = await getSearchData(q, category, isFeatured)

  const activeCategoryName = category
    ? (categories.find((c) => c.slug === category)?.name ?? 'Products')
    : null

  const heading = q
    ? `Results for "${q}"`
    : activeCategoryName ?? (isFeatured ? 'Best Sellers' : 'All Products')

  const isFiltered = !!q || !!category || isFeatured

  // min-h-screen deliberately MATCHES the shop layout's `<main class="min-h-screen">`.
  // Anything shorter (e.g. calc(100vh-73px)) leaves main taller than its own
  // content, and that surplus shows as empty cream above the footer.
  // `data-flush-footer` additionally collapses the footer's mt-24 for this
  // full-bleed layout — see globals.css.
  return (
    <div data-flush-footer className="min-h-screen flex flex-col lg:flex-row">

      {/* ══════════════════════════════════════════
          LEFT SIDEBAR — Black branded panel
      ══════════════════════════════════════════ */}
      <aside className="lg:w-64 xl:w-72 flex-shrink-0 bg-primary relative">
        {/* Decorations get their own clipping layer. `overflow-hidden` used to
            sit on the <aside> itself, which made it the sticky panel's nearest
            scroll container — that killed the sticking AND clipped any filters
            past the panel's box instead of letting them scroll. */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Ambient orb */}
          <div className="absolute -bottom-24 -left-12 w-64 h-64 bg-white/5 rounded-full blur-[60px]" />
        </div>

        {/* 73px = the sticky site header (logo h-12 = 48px + py-3 = 24px + 1px
            border). Offsetting by it keeps the panel out from under the header;
            sizing to the REMAINING viewport is what stops the tail of the
            category list and the copyright being pushed off-screen, which is
            what "cut off" was. Height stays definite so `mt-auto` still pins
            the copyright to the bottom, and overflow-y-auto scrolls a long
            category list inside the panel. */}
        <div className="relative z-10 p-6 lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] lg:overflow-y-auto scrollbar-hide flex flex-col">

          {/* Logo removed — the site header already shows it directly above
              this panel. Dropping it also returns ~60px to the category list. */}
          <div className="mb-4 hidden lg:block flex-shrink-0">
            <p className="text-[12px] font-black text-white/35">
              Beauty Store
            </p>
          </div>

          {/* Page title — desktop */}
          <div className="mb-4 hidden lg:block border-b border-white/10 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              {isFeatured
                ? <TrendingUp size={12} className="text-white/40" strokeWidth={2.5} />
                : <Sparkles size={12} className="text-white/40" strokeWidth={2.5} />
              }
              <span className="text-[11px] font-black text-white/40">
                {isFeatured ? 'Curated' : isFiltered ? 'Filtered' : 'Full Catalog'}
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight leading-tight">
              {heading}
            </h1>
            <p className="text-xs text-white/40 font-medium mt-1">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </p>
          </div>

          {/* Category nav — desktop sidebar.
              `min-h-0` is the fix: a flex child defaults to min-height:auto, so
              this column refused to shrink below its content and the last
              categories were clipped instead of becoming scrollable. With it,
              the list takes the leftover height and scrolls inside itself — the
              brand, title and copyright stay put. Items are compact enough that
              a typical category count needs no scrolling at all. */}
          {categories.length > 0 && (
            <div className="hidden lg:flex flex-col gap-0.5 flex-1 min-h-[120px] overflow-y-auto overscroll-contain scrollbar-thin-light -mr-2 pr-2">
              <p className="text-[11px] font-black text-white/35 mb-2 px-1 flex-shrink-0">
                Categories
              </p>

              {/* All link */}
              <Link
                href="/search"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] font-semibold transition duration-200 flex-shrink-0 ${
                  !category && !isFeatured
                    ? 'bg-white text-primary'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                }`}
              >
                <LayoutGrid size={14} strokeWidth={2.5} className="flex-shrink-0" />
                All Products
              </Link>

              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/search?category=${cat.slug}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] font-semibold transition duration-200 truncate flex-shrink-0 ${
                    category === cat.slug
                      ? 'bg-white text-primary'
                      : 'text-white/60 hover:text-white hover:bg-white/8'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />
                  <span className="truncate">{cat.name}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Bottom copyright */}
          <div className="mt-auto pt-4 hidden lg:block flex-shrink-0">
            <p className="text-[11px] font-bold text-white/20">
              © 2026 Kuthari Beauty Store
            </p>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          RIGHT — Search + Results
      ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col">

        {/* Mobile hero strip */}
        <div className="lg:hidden relative overflow-hidden bg-surface border-b border-table-border px-4 py-7">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              {isFeatured
                ? <TrendingUp size={12} className="text-primary/50" strokeWidth={2.5} />
                : <Sparkles size={12} className="text-primary/50" strokeWidth={2.5} />
              }
              <span className="text-[11px] font-black text-on-surface-variant">
                {isFeatured ? 'Curated Selection' : isFiltered ? 'Filtered Results' : 'Full Catalog'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-primary tracking-tight">{heading}</h1>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              {products.length} {products.length === 1 ? 'product' : 'products'} available
            </p>
          </div>
        </div>

        {/* Search bar + mobile category chips */}
        <div className="px-4 pt-5 pb-3 border-b border-table-border bg-surface-container-low/40">
          <Suspense>
            <SearchControls
              categories={categories}
              initialQ={q}
              initialCategory={category}
              hideCategoriesOnDesktop
            />
          </Suspense>
        </div>

        {/* Results area */}
        <div className="flex-1 px-4 py-5">
          {products.length > 0 ? (
            <>
              {/* Desktop count + heading */}
              <div className="hidden lg:flex items-center gap-3 mb-5">
                <h1 className="text-lg font-black text-primary tracking-tight">{heading}</h1>
                <div className="h-px flex-1 bg-table-border" />
                <span className="text-[11px] font-black text-on-surface-variant/50">
                  {products.length} {products.length === 1 ? 'Product' : 'Products'}
                </span>
              </div>

              {/* Mobile count bar */}
              <div className="flex lg:hidden items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-table-border" />
                <span className="text-[11px] font-black text-on-surface-variant/50">
                  {products.length} {products.length === 1 ? 'Product' : 'Products'}
                </span>
                <div className="h-px flex-1 bg-table-border" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} className="w-full" />
                ))}
              </div>
            </>
          ) : (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
              <div className="relative">
                <div className="w-20 h-20 border-2 border-table-border bg-surface-card flex items-center justify-center rounded-3xl shadow-sm">
                  <PackageSearch size={32} className="text-on-surface-variant/40" />
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-[12px] font-black">0</span>
                </div>
              </div>

              <div className="max-w-xs">
                <p className="font-black text-primary text-lg tracking-tight">
                  No products found
                </p>
                <p className="text-sm text-on-surface-variant/70 font-medium mt-1.5 leading-relaxed">
                  {q
                    ? `No results for "${q}". Try a different term or browse all categories.`
                    : 'No products available in this category yet.'}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full max-w-xs">
                <div className="h-px flex-1 bg-table-border" />
                <span className="text-[12px] font-black text-on-surface-variant/40">or</span>
                <div className="h-px flex-1 bg-table-border" />
              </div>

              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-black text-xs rounded-xl hover:bg-primary/90 transition duration-200 active:scale-95 shadow-sm"
              >
                Browse All Products
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
