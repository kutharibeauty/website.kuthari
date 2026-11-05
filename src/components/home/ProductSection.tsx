'use client'

import { useT } from '@/hooks/useT'
import ProductCard from '@/components/product/ProductCard'
import SectionHead from './SectionHead'
import type { Product } from '@/types/database.types'

interface Props {
  title: string
  titleOr?: string | null
  products: Product[]
  viewAllHref?: string
  /** Total products in this aisle, for the "Shop all" link. */
  total?: number
}

/** One aisle as a row you scroll sideways: the head, then the shelf. */
export default function ProductSection({ title, titleOr, products, viewAllHref, total }: Props) {
  const { tField } = useT()
  if (!products.length) return null

  const displayTitle = tField(title, titleOr)

  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 md:px-10 reveal">
      <SectionHead
        title={displayTitle}
        link={viewAllHref ? { href: viewAllHref, label: total ? `Shop all ${total}` : 'Shop all' } : undefined}
      />
      <div className="mt-8 -mx-5 md:-mx-10 px-5 md:px-10 flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} className="snap-start" />
        ))}
      </div>
    </section>
  )
}
