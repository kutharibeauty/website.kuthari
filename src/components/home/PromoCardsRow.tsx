'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useT } from '@/hooks/useT'
import type { Banner } from '@/types/database.types'

interface Props {
  cards: Banner[]
}

export default function PromoCardsRow({ cards }: Props) {
  const { tField } = useT()

  if (!cards.length) return null

  return (
    <section className="px-4 md:px-8 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card, i) => {
          const title = card.title ? tField(card.title, card.title_or) : null
          const subtitle = card.subtitle ? tField(card.subtitle, card.subtitle_or) : null
          const ctaText = card.cta_text ? tField(card.cta_text, card.cta_text_or) : null

          const content = (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex flex-col justify-between h-full min-h-[168px] md:min-h-[200px] rounded-2xl p-5 overflow-hidden group cursor-pointer"
              style={{ backgroundColor: card.background_color }}
            >
              <div className="relative z-10">
                {title && (
                  <h4
                    className="text-lg md:text-xl font-black tracking-tight leading-tight"
                    style={{ color: card.text_color }}
                  >
                    {title}
                  </h4>
                )}
                {subtitle && (
                  <p
                    className="text-xs md:text-sm font-medium mt-1.5 leading-snug opacity-80"
                    style={{ color: card.text_color }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>

              {ctaText && (
                <span
                  className="relative z-10 inline-flex w-max items-center px-4 py-2 rounded-lg bg-black/20 backdrop-blur-sm text-xs font-bold group-hover:bg-black/30 transition-colors"
                  style={{ color: card.text_color }}
                >
                  {ctaText}
                </span>
              )}

              <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
            </motion.div>
          )

          return card.link_url ? (
            <Link key={card.id} href={card.link_url} className="block h-full">
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
