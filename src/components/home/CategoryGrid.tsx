'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useT } from '@/hooks/useT'
import type { Category } from '@/types/database.types'

interface Props {
  categories: Category[]
}

export default function CategoryGrid({ categories }: Props) {
  const { t, tField, language } = useT()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  if (!categories.length) return null

  const tiles = categories.slice(0, 7)

  return (
    <section className="px-4 md:px-8 max-w-7xl mx-auto w-full py-12 md:py-20">
      <div className="flex flex-col items-center text-center mb-12">
        <span className="eyebrow">Explore</span>
        <h3 className="display text-3xl md:text-5xl mt-3">
          {t('category.sectionTitle')}
        </h3>
        <div className="rule-gold w-24 mt-5" />
        <Link href="/search" className="link-underline mt-5 text-[11px] font-semibold tracking-[0.14em] uppercase text-on-surface-variant hover:text-primary transition-colors">
          {t('product.viewAll')}
        </Link>
      </div>

      <div ref={ref} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {tiles.map((cat, i) => {
          const name = tField(cat.name, cat.name_or)
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link href={`/category/${cat.slug}`} className="block h-full">
                <div className="relative h-52 md:h-64 rounded-3xl overflow-hidden border border-table-border/60 bg-surface-container group card-soft-hover transition-all duration-300 ease-out">
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={name}
                      fill
                      sizes="(max-width: 768px) 50vw, 300px"
                      className="object-cover group-hover:scale-[1.07] transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-surface-variant to-surface-container-high" />
                  )}

                  {/* Bottom gradient scrim for legible label */}
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

                  {/* Label */}
                  <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col">
                    <span className="font-heading text-base md:text-lg font-semibold tracking-tight text-white truncate drop-shadow-sm">
                      {cat.name}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}

        {/* Shop All tile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: tiles.length * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/search" className="block h-full">
            <div className="relative h-52 md:h-64 rounded-3xl border border-table-border/60 bg-surface-container-low/60 flex flex-col items-center justify-center gap-4 group card-soft-hover transition-all duration-300 ease-out hover:bg-primary">
              <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-white/15 flex items-center justify-center transition-colors duration-300">
                <LayoutGrid size={20} className="text-primary group-hover:text-white transition-colors" strokeWidth={2.5} />
              </div>
              <span className="font-heading text-base font-semibold tracking-tight text-primary group-hover:text-white transition-colors">
                {t('category.shopAll')}
              </span>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
