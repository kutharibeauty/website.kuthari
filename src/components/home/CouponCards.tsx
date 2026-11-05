'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useT } from '@/hooks/useT'
import SectionHead from './SectionHead'
import type { Coupon } from '@/types/database.types'

interface Props {
  coupons: Coupon[]
}

/** Live coupons, each a navy ticket with the discount set huge and a copy button. */
export default function CouponCards({ coupons }: Props) {
  const { tField } = useT()
  const [copied, setCopied] = useState<string | null>(null)

  if (!coupons.length) return null

  const copy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 md:px-10 reveal" aria-labelledby="offers-head">
      <SectionHead id="offers-head" title="On the house" accent="(this week's codes)" />
      <div className="mt-8 -mx-5 md:mx-0 px-5 md:px-0 flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide snap-x">
        {coupons.map((coupon) => {
          const discount =
            coupon.discount_type === 'percentage' ? `${coupon.discount_value}% off` : `₹${coupon.discount_value} off`
          const desc = coupon.description ? tField(coupon.description, coupon.description_or) : null
          const isCopied = copied === coupon.code

          return (
            <div
              key={coupon.id}
              className="snap-start shrink-0 w-[300px] md:w-[360px] flex flex-col justify-between gap-6 rounded-[var(--radius-card)] bg-ink p-6 text-paper-raised"
            >
              <div>
                <p className="display text-periwinkle text-[clamp(3rem,2.4rem+2vw,4.5rem)]">{discount}</p>
                {desc && <p className="mt-2 text-[15px] leading-snug text-paper-raised/90 line-clamp-2">{desc}</p>}
              </div>
              <div className="flex items-center justify-between gap-3 rounded-full bg-paper-raised py-1.5 pl-5 pr-1.5 text-ink">
                <span className="font-bold text-[16px] whitespace-nowrap">{coupon.code}</span>
                <button
                  type="button"
                  onClick={() => copy(coupon.code)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-paper-raised hover:bg-indigo hover:text-paper-raised transition-colors"
                  aria-label={`Copy code ${coupon.code}`}
                >
                  {isCopied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {isCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
