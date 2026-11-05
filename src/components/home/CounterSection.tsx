'use client'

import { Check } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { TrustBadgeItem } from '@/lib/data/homepage'
import { DEFAULT_CONTENT, type StoreContent } from '@/lib/data/store-content-defaults'

// Used when the admin hasn't authored trust badges in Banners & CMS → Homepage.
// Only things the shop actually does.
const FALLBACK: TrustBadgeItem[] = [
  { icon: 'inventory_2', text: 'One piece or a full box', text_or: '' },
  { icon: 'payments', text: 'Secure online payment', text_or: '' },
  { icon: 'local_shipping', text: 'Delivery across India', text_or: '' },
  { icon: 'storefront', text: 'Shop in Sano Bazar, Brahmapur', text_or: '' },
]

/**
 * The ink band: how long the counter has been open, set as large as the page
 * allows, then the promises the shop makes on every order.
 */
export default function CounterSection({
  badges,
  stats = DEFAULT_CONTENT.stats,
}: {
  badges?: TrustBadgeItem[]
  /** Banners & CMS → Homepage → Store figures. */
  stats?: StoreContent['stats']
}) {
  const { tField } = useT()
  const items = badges && badges.length > 0 ? badges : FALLBACK

  return (
    <section className="bg-ink text-paper-raised" aria-labelledby="counter-head">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 py-[var(--spacing-section)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end reveal">
          <div className="relative min-w-0">
            <h2 id="counter-head" className="display text-paper-raised text-[length:var(--text-section)]">
              {stats.headline}
            </h2>
            <p className="accent-line text-periwinkle text-[calc(var(--text-section)*0.82)]">{stats.accent}</p>
          </div>
          <p className="text-[18px] leading-relaxed text-paper-raised/80 max-w-[42ch] lg:justify-self-end">
            {stats.blurb}
          </p>
        </div>

        {stats.items.length > 0 && (
        <ul className={`mt-14 grid gap-4 reveal ${stats.items.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
          {stats.items.map((s) => (
            <li key={s.label} className="rounded-[var(--radius-card)] border border-paper-raised/15 p-6 md:p-8">
              <span className="display block text-paper-raised text-[clamp(3.5rem,2.5rem+3vw,6rem)]">{s.value}</span>
              <span className="mt-3 block text-[16px] text-paper-raised/75">{s.label}</span>
            </li>
          ))}
        </ul>
        )}

        <ul className="mt-10 flex flex-wrap gap-3 reveal" aria-label="What every order gets">
          {items.map((b, i) => (
            <li
              key={`${b.text}-${i}`}
              className="inline-flex items-center gap-2 rounded-full border border-paper-raised/20 px-4 py-2.5 text-[15px] font-semibold"
            >
              <Check size={16} strokeWidth={2.75} className="text-periwinkle" aria-hidden="true" />
              {tField(b.text, b.text_or)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
