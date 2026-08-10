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
    <section ref={ref} className="px-4 md:px-8 max-w-7xl mx-auto w-full">
      <div className="rule-gold mb-2" />
      <div className="flex lg:grid lg:grid-cols-6 gap-1 lg:gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide snap-x snap-mandatory lg:divide-x lg:divide-table-border/50">
        {items.map((badge, i) => (
          <motion.div
            key={`${badge.text}-${i}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
            className="snap-start w-[130px] sm:w-[145px] lg:w-auto flex-shrink-0 group flex flex-col items-center text-center gap-3 py-5 px-3"
          >
            {/* Outlined mark rather than a filled gradient chip — lighter, and
                it lets the ivory ground show through. */}
            <div className="w-12 h-12 rounded-full border border-secondary/35 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:border-secondary group-hover:bg-secondary/8">
              <span
                className="material-symbols-outlined text-secondary text-[20px] transition-transform duration-300 group-hover:scale-110"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                {badge.icon}
              </span>
            </div>
            <span className="text-[11px] font-medium text-on-surface-variant leading-snug tracking-wide">
              {tField(badge.text, badge.text_or)}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="rule-gold mt-2" />
    </section>
  )
}
