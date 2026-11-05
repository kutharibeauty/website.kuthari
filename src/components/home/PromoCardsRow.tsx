'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { Banner } from '@/types/database.types'

interface Props {
  cards: Banner[]
}

/** The admin's mid-page promo cards (Banners & CMS), each in its own colour. */
export default function PromoCardsRow({ cards }: Props) {
  const { tField } = useT()

  if (!cards.length) return null

  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 md:px-10 reveal">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {cards.map((card) => {
          const title = card.title ? tField(card.title, card.title_or) : null
          const subtitle = card.subtitle ? tField(card.subtitle, card.subtitle_or) : null
          const ctaText = card.cta_text ? tField(card.cta_text, card.cta_text_or) : null

          const content = (
            <div
              className="group relative flex h-full min-h-[200px] md:min-h-[240px] flex-col justify-between rounded-[var(--radius-card)] bg-periwinkle p-5 md:p-6 transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
              style={{ backgroundColor: card.background_color || undefined, color: card.text_color || undefined }}
            >
              <div>
                {title && <h3 className="display text-[clamp(1.75rem,1.3rem+1.4vw,2.5rem)] text-current">{title}</h3>}
                {subtitle && <p className="mt-2 text-[15px] leading-snug opacity-85">{subtitle}</p>}
              </div>
              {ctaText && (
                <span className="mt-5 inline-flex w-max items-center gap-3 text-[15px] font-semibold">
                  {ctaText}
                  <span className="arrow-chip h-9 w-9 group-hover:translate-x-0.5">
                    <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                </span>
              )}
            </div>
          )

          return card.link_url ? (
            <Link key={card.id} href={card.link_url} className="block h-full rounded-[var(--radius-card)]">
              {content}
            </Link>
          ) : (
            <div key={card.id} className="h-full">{content}</div>
          )
        })}
      </div>
    </section>
  )
}
