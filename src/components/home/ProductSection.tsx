'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useT } from '@/hooks/useT'
import ProductCard from '@/components/product/ProductCard'
import type { Product } from '@/types/database.types'

interface Props {
  title: string
  titleOr?: string | null
  products: Product[]
  viewAllHref?: string
}

export default function ProductSection({ title, titleOr, products, viewAllHref }: Props) {
  const { t, tField } = useT()
  if (!products.length) return null

  const displayTitle = tField(title, titleOr)

  return (
    <section className="px-4 md:px-8 max-w-7xl mx-auto w-full py-6 md:py-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <h3 className="display text-2xl md:text-[28px]">{displayTitle}</h3>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="group/all link-underline text-[11px] font-semibold tracking-[0.14em] uppercase text-on-surface-variant hover:text-primary flex items-center gap-1.5 transition-colors flex-shrink-0"
          >
            {t('product.viewAll')}
            <ArrowRight size={12} className="transition-transform duration-200 group-hover/all:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* Mobile: horizontal scroll.
           The whole row reveals as one. Per-card whileInView cannot work here:
           cards past the second sit off-screen horizontally, never intersect
           the viewport, and would stay at opacity 0 forever. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 md:hidden"
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </motion.div>

      {/* Desktop: up to 5 + "View All" tile */}
      <div className="hidden md:flex gap-4 overflow-hidden py-2 px-1">
        {products.slice(0, 5).map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProductCard product={p} />
          </motion.div>
        ))}
        {products.length > 5 && viewAllHref && (
          <Link
            href={viewAllHref}
            className="w-52 flex-shrink-0 rounded-[1.25rem] border border-dashed border-table-border hover:border-primary/40 bg-surface-container-low/40 hover:bg-surface-card flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:text-primary transition-all duration-300 group hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-full bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-500 ring-4 ring-transparent group-hover:ring-primary/5">
              <ArrowRight size={20} className="text-primary transition-transform duration-500 group-hover:translate-x-1" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{t('product.viewAll')}</span>
          </Link>
        )}
      </div>
    </section>
  )
}
