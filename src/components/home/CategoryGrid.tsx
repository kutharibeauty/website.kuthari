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
      <div className="flex flex-col mb-12">
        <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-primary">
          {t('category.sectionTitle')}
        </h3>
        <Link href="/search" className="mt-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-primary hover:text-primary/70 underline underline-offset-4 transition-colors w-max">
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
                <div className="relative h-44 md:h-56 rounded-2xl overflow-hidden border border-table-border/70 bg-surface-container group shadow-[0_2px_10px_rgba(27, 44, 61,0.05)] hover:shadow-[0_16px_34px_rgba(27, 44, 61,0.16)] hover:-translate-y-1.5 transition-all duration-300 ease-out">
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
                    {language === 'od' && cat.name_or ? (
                      <span className="font-odia text-[11px] text-white/75 leading-tight mb-0.5 truncate">{cat.name_or}</span>
                    ) : null}
                    <span className="text-sm md:text-base font-black tracking-tight text-white truncate drop-shadow-sm">
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
            <div className="relative h-44 md:h-56 rounded-2xl border border-table-border/70 bg-gradient-to-br from-surface-container-low to-surface-container flex flex-col items-center justify-center gap-4 group transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_34px_rgba(27, 44, 61,0.16)] hover:from-primary hover:to-primary-container">
              <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-white/15 flex items-center justify-center transition-colors duration-300">
                <LayoutGrid size={20} className="text-primary group-hover:text-white transition-colors" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-black tracking-tight text-primary group-hover:text-white transition-colors">
                {t('category.shopAll')}
              </span>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
