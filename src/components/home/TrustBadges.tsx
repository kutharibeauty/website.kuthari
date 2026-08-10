'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useT } from '@/hooks/useT'
import type { TrustBadgeItem } from '@/lib/data/homepage'

// Fallback shown when the admin hasn't authored any trust badges in
// Banners & CMS → Homepage. Icons are Material Symbols names, matching the CMS editor.
const FALLBACK: TrustBadgeItem[] = [
  { icon: 'local_shipping', text: 'Fast Delivery', text_or: '' },
  { icon: 'verified_user', text: 'Quality Assured', text_or: '' },
  { icon: 'payments', text: 'Secure Online Payment', text_or: '' },
  { icon: 'schedule', text: 'Order Anytime', text_or: '' },
  { icon: 'groups', text: '3.5L+ Customers', text_or: '' },
  { icon: 'inventory_2', text: 'Bulk Orders', text_or: '' },
]

export default function TrustBadges({ badges }: { badges?: TrustBadgeItem[] }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const { tField } = useT()
  const items = badges && badges.length > 0 ? badges : FALLBACK
  return (
    <section ref={ref} className="px-4 max-w-7xl mx-auto w-full">
      <div className="flex lg:grid lg:grid-cols-6 gap-3 lg:gap-4 overflow-x-auto lg:overflow-visible scrollbar-hide pb-4 lg:pb-0 snap-x snap-mandatory">
        {items.map((badge, i) => (
          <motion.div
            key={`${badge.text}-${i}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
            className="snap-start w-[140px] sm:w-[150px] lg:w-auto flex-shrink-0 group relative flex flex-col items-center text-center gap-3 p-4 sm:p-5 bg-gradient-to-b from-surface-card to-surface-container-low/30 border border-table-border/60 hover:border-primary/40 rounded-[1.5rem] shadow-[0_4px_12px_rgba(27, 44, 61,0.02)] hover:shadow-[0_16px_40px_rgba(27, 44, 61,0.08)] hover:-translate-y-1.5 transition-all duration-500 overflow-hidden"
          >
            {/* Glass glares and shimmers */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay z-20" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

            {/* Premium Icon Container */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 group-hover:from-primary/10 group-hover:to-primary/20 flex items-center justify-center transition-colors duration-500 ring-1 ring-primary/5 group-hover:ring-primary/20 flex-shrink-0 z-10 relative shadow-inner">
              <span
                className="material-symbols-outlined text-primary text-[22px] group-hover:scale-110 transition-transform duration-500 drop-shadow-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {badge.icon}
              </span>
            </div>

            {/* Cinematic Typography */}
            <div className="flex flex-col gap-1 z-10 relative mt-1">
              <span className="text-[11px] font-black text-primary uppercase tracking-widest leading-tight">
                {tField(badge.text, badge.text_or)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
