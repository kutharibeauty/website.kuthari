'use client'

import { useMemo, useState } from 'react'
import ProductCard from '@/components/product/ProductCard'
import SectionHead from './SectionHead'
import { cn } from '@/lib/utils'
import type { Category, Product } from '@/types/database.types'

// Spelled out so Tailwind sees every class name.
const STAGGER = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5']

interface Props {
  products: Product[]
  categories: Pick<Category, 'id' | 'name'>[]
  /** Featured picks get the bestseller head; otherwise this is what's new. */
  featured: boolean
}

/**
 * The shelf: up to eight products in a four-across grid, filtered by the
 * aisles they actually come from. Filter chips only appear for categories that
 * have a product in this set, so no chip ever empties the grid.
 */
export default function ShelfGrid({ products, categories, featured }: Props) {
  const [active, setActive] = useState<string>('all')

  const chips = useMemo(() => {
    const present = new Set(products.map((p) => p.category_id).filter(Boolean))
    return categories.filter((c) => present.has(c.id))
  }, [products, categories])

  const shown = (active === 'all' ? products : products.filter((p) => p.category_id === active)).slice(0, 8)

  if (!products.length) return null

  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 md:px-10 reveal" aria-labelledby="shelf-head">
      <SectionHead
        id="shelf-head"
        title={featured ? 'Most reached for' : 'Fresh on the shelf'}
        accent={featured ? '(bestsellers)' : '(new in)'}
        link={{ href: featured ? '/search?featured=true' : '/search', label: 'Shop everything' }}
      />

      {chips.length > 1 && (
        <div className="mt-8 flex gap-2.5 overflow-x-auto scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0" role="group" aria-label="Filter by category">
          {[{ id: 'all', name: 'All' }, ...chips].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.id)}
              aria-pressed={active === c.id}
              className={cn(
                'shrink-0 rounded-full border px-5 py-2.5 text-[15px] font-semibold transition-colors',
                active === c.id
                  ? 'bg-ink border-ink text-paper-raised'
                  : 'border-ink/20 text-ink hover:border-ink',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div
        key={active}
        className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-5"
      >
        {shown.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            className={cn('w-full md:w-full animate-rise', STAGGER[i])}
          />
        ))}
      </div>
    </section>
  )
}
