'use client'

import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Tag, Copy, Check } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { Coupon } from '@/types/database.types'

interface Props {
  coupons: Coupon[]
}

export default function CouponCards({ coupons }: Props) {
  const { tField } = useT()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [copied, setCopied] = useState<string | null>(null)

  if (!coupons.length) return null

  const copy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <section className="px-4 max-w-7xl mx-auto w-full">
      <h3 className="text-sm font-black uppercase tracking-wider text-primary mb-3">Active Offers</h3>
      <div ref={ref} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {coupons.map((coupon, i) => {
          const discount =
            coupon.discount_type === 'percentage'
              ? `${coupon.discount_value}% OFF`
              : `₹${coupon.discount_value} OFF`
          const desc = coupon.description
            ? tField(coupon.description, coupon.description_or)
            : null
          const isCopied = copied === coupon.code

          return (
            <motion.div
              key={coupon.id}
              initial={{ opacity: 0, x: 24 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
              className="flex-shrink-0 w-72"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-sm flex items-stretch min-h-[96px] border border-table-border/40">
                {/* Decorative background glow */}
                <div className="absolute -top-5 -right-5 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />

                {/* Left — discount info */}
                <div className="flex-1 p-4 flex flex-col justify-center bg-gradient-to-br from-primary to-primary-container text-white">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {/* Cream, not primary-fixed: that token is #2E2011, i.e. the
                        same brown as this panel — 1.16:1, effectively invisible. */}
                    <Tag size={10} className="text-on-primary-fixed-variant" />
                    <span className="text-[8px] font-black text-on-primary-fixed-variant uppercase tracking-widest">
                      Coupon
                    </span>
                  </div>
                  <div className="text-xl font-black text-white leading-tight tracking-tight">
                    {discount}
                  </div>
                  {desc && (
                    <div className="text-[10px] text-white/70 mt-1 leading-snug line-clamp-2">
                      {desc}
                    </div>
                  )}
                </div>

                {/* Separator with punch-holes */}
                <div className="relative flex flex-col items-center justify-center w-4 bg-gradient-to-b from-primary to-primary-container">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-background rounded-full border-b border-table-border/40" />
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-background rounded-full border-t border-table-border/40" />
                  <div className="h-full border-l border-dashed border-white/25" />
                </div>

                {/* Right — code + copy */}
                {/* Sized to its content with a floor, rather than a fixed w-26:
                    a code longer than the old 104px had nowhere to go and broke
                    onto a second line. The panel now widens for a long code and
                    the flex-1 left side gives up the space. */}
                <div className="flex-shrink-0 min-w-[104px] flex flex-col items-center justify-center gap-1.5 py-4 px-3 bg-gradient-to-br from-primary-fixed to-primary-fixed-dim/90 text-on-primary-fixed-variant">
                  <span className="text-[9px] font-black tracking-wider text-secondary uppercase">Code</span>
                  {/* The code sat at text-primary (#1C130A) on a #2E2011 panel —
                      1.16:1. Cream takes it to 15:1. */}
                  {/* whitespace-nowrap keeps the code on ONE line — break-all was
                      splitting it mid-word ("LAUNCH20" / "0"). Tracking eased off
                      from widest so a normal-length code still fits the floor
                      width. Colour: was text-primary (#1C130A) on a #2E2011
                      panel — 1.16:1; cream takes it to 15:1. */}
                  <span className="text-xs font-black text-on-primary-fixed tracking-wide text-center whitespace-nowrap leading-tight">
                    {coupon.code}
                  </span>
                  <button
                    onClick={() => copy(coupon.code)}
                    className={`flex items-center gap-1 text-[9px] font-bold px-3 py-1 rounded-full transition-all duration-300 shadow-3xs active:scale-95 ${
                      isCopied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-primary text-on-primary hover:bg-primary/90'
                    }`}
                  >
                    {isCopied ? <Check size={9} /> : <Copy size={9} />}
                    {isCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
