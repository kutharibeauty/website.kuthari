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
    <section className="px-4 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-primary">{displayTitle}</h3>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs font-bold text-primary hover:text-secondary underline underline-offset-3 flex items-center gap-1 transition-colors"
          >
            {t('product.viewAll')}
            <ArrowRight size={12} className="inline-block transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 md:hidden">
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProductCard product={p} />
          </motion.div>
        ))}
      </div>

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
            className="w-44 flex-shrink-0 rounded-2xl border-2 border-dashed border-outline-variant/60 hover:border-primary/50 bg-surface-container-low/40 hover:bg-surface-card flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:text-primary transition-all duration-500 shadow-none hover:shadow-[0_12px_32px_rgba(27, 44, 61,0.08)] group hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-full bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-500 ring-4 ring-transparent group-hover:ring-primary/5">
              <ArrowRight size={20} className="text-primary transition-transform duration-500 group-hover:translate-x-1" />
            </div>
            <span className="text-sm font-black tracking-wide">{t('product.viewAll')}</span>
          </Link>
        )}
      </div>
    </section>
  )
}
