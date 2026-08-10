'use client'

import { useState, useTransition, useEffect } from 'react'
import { SlidersHorizontal, Loader2, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import ProductGrid from '@/components/product/ProductGrid'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'
import type { Product } from '@/types/database.types'
import type { SortOption } from '@/lib/data/category'

const PAGE_SIZE = 12

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low–High' },
  { value: 'price_desc', label: 'Price: High–Low' },
  { value: 'newest', label: 'Newest' },
]

interface Props {
  categoryId: string
  initialProducts: Product[]
  initialTotal: number
}

/**
 * Per-category view state, kept for the browser SESSION so returning to a
 * category (via the back button) restores the products you already loaded and
 * your sort/filter — instead of resetting to the first page. That reset also
 * remounted the grid at a short height, which is why the browser then dumped you
 * at the bottom of it. Module-level so it survives client-side navigation; a
 * full page reload clears it and SSR provides a fresh first page.
 */
type CategoryViewState = {
  products: Product[]
  total: number
  page: number
  sort: SortOption
  inStockOnly: boolean
}
const categoryViewCache = new Map<string, CategoryViewState>()

async function fetchProducts(
  categoryId: string,
  sort: SortOption,
  inStockOnly: boolean,
  page: number,
): Promise<{ products: Product[]; total: number }> {
  const supabase = createClient()

  // select('*') on purpose — the live schema has drifted; naming a column that
  // doesn't exist fails the whole query and empties the grid.
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('category_id', categoryId)
    .eq('is_active', true)

  if (inStockOnly) query = query.gt('stock_qty', 0)

  switch (sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price', { ascending: false })
      break
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
  }

  const from = (page - 1) * PAGE_SIZE
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1)
  return { products: (data ?? []) as unknown as Product[], total: count ?? 0 }
}

export default function CategoryProductsSection({ categoryId, initialProducts, initialTotal }: Props) {
  // Restore this category's prior view (products loaded, page, sort, filter) if
  // we're returning to it in the same session; otherwise start from the SSR page.
  const cached = categoryViewCache.get(categoryId)
  const [sort, setSort] = useState<SortOption>(cached?.sort ?? 'featured')
  const [inStockOnly, setInStockOnly] = useState(cached?.inStockOnly ?? false)
  const [page, setPage] = useState(cached?.page ?? 1)
  const [products, setProducts] = useState<Product[]>(cached?.products ?? initialProducts)
  const [total, setTotal] = useState(cached?.total ?? initialTotal)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Keep the session cache in step with the current view, so the next return to
  // this category picks up exactly here.
  useEffect(() => {
    categoryViewCache.set(categoryId, { products, total, page, sort, inStockOnly })
  }, [categoryId, products, total, page, sort, inStockOnly])

  const hasMore = products.length < total

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort)
    startTransition(async () => {
      const result = await fetchProducts(categoryId, newSort, inStockOnly, 1)
      setProducts(result.products)
      setTotal(result.total)
      setPage(1)
    })
  }

  const handleInStockChange = (checked: boolean) => {
    setInStockOnly(checked)
    startTransition(async () => {
      const result = await fetchProducts(categoryId, sort, checked, 1)
      setProducts(result.products)
      setTotal(result.total)
      setPage(1)
    })
  }

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    const nextPage = page + 1
    const result = await fetchProducts(categoryId, sort, inStockOnly, nextPage)
    setProducts((prev) => [...prev, ...result.products])
    setPage(nextPage)
    setIsLoadingMore(false)
  }

  return (
    <div>
      {/* ── Sort & Filter bar ── */}
      <div className="bg-surface-container-low border-b border-outline-variant py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            {/* Sort — dropdown on mobile, pills on desktop */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex-shrink-0 flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                <SlidersHorizontal size={13} />
                Sort
              </span>

              {/* Mobile: native dropdown (keeps the bar tidy on small screens) */}
              <div className="relative sm:hidden flex-shrink-0">
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  aria-label="Sort products"
                  className="appearance-none pl-3.5 pr-8 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-surface-card text-on-surface">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-primary pointer-events-none"
                />
              </div>

              {/* Desktop: pills */}
              <div className="hidden sm:flex items-center gap-2 overflow-x-auto scrollbar-hide min-w-0">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSortChange(opt.value)}
                    className={cn(
                      'flex-shrink-0 px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors',
                      sort === opt.value
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* In-Stock toggle */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap hidden sm:inline">
                In Stock
              </span>
              <button
                role="switch"
                aria-checked={inStockOnly}
                onClick={() => handleInStockChange(!inStockOnly)}
                className={cn(
                  'relative w-9 h-5 rounded-full transition-colors duration-200',
                  inStockOnly ? 'bg-primary' : 'bg-outline-variant',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                    inStockOnly ? 'translate-x-[18px]' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>
          </div>

          {/* Result count */}
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-2">
            {total} {total === 1 ? 'product' : 'products'} found
            {inStockOnly && ' · In stock only'}
          </p>
        </div>
      </div>

      {/* ── Product grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isPending ? (
          <ProductGridSkeleton count={products.length || 12} />
        ) : (
          <>
            <ProductGrid
              products={products}
              emptyMessage={
                inStockOnly
                  ? 'No in-stock products found. Try removing the In Stock filter.'
                  : 'No products found in this category.'
              }
            />

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-8 py-3 rounded-full border-[1.5px] border-primary text-primary hover:bg-surface-container font-label-sm text-label-sm uppercase tracking-wider transition-colors disabled:opacity-60"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Loading…
                    </>
                  ) : (
                    `Load More (${total - products.length} remaining)`
                  )}
                </button>
              </div>
            )}

            {!hasMore && products.length > 0 && (
              <p className="text-center font-label-sm text-label-sm text-on-surface-variant mt-8">
                All {total} products loaded
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
