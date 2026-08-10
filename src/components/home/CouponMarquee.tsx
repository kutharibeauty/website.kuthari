'use client'

import { Tag, Megaphone } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { Coupon } from '@/types/database.types'

type CouponItem = Pick<
  Coupon,
  | 'id' | 'code' | 'description' | 'description_or' | 'discount_type' | 'discount_value'
  | 'marquee_message' | 'marquee_message_or'
>

/** A standalone ticker line authored in Banners & CMS → Announcements. */
export interface MarqueeLine {
  text: string
  text_or: string
}

interface Props {
  coupons: CouponItem[]
  /** Custom lines shown alongside the coupons, not tied to any coupon. */
  customLines?: MarqueeLine[]
}

export default function CouponMarquee({ coupons, customLines = [] }: Props) {
  const { tField } = useT()
  if (!coupons.length && !customLines.length) return null

  const renderCoupon = (c: CouponItem, key: string) => {
    const label =
      c.discount_type === 'percentage'
        ? `${c.discount_value}% OFF`
        : `₹${c.discount_value} OFF`
    const desc = c.description ? tField(c.description, c.description_or) : null
    // An admin-written line for THIS coupon (migration 030). When present it
    // replaces the auto-composed "20% OFF · description" half; the code still
    // leads, since that's what the customer has to copy.
    const custom = c.marquee_message
      ? tField(c.marquee_message, c.marquee_message_or ?? null)
      : null

    return (
      <span key={key} className="inline-flex items-center gap-2 px-6">
        <Tag size={12} className="text-white flex-shrink-0 animate-pulse" />
        <span className="tracking-wider uppercase text-white">{c.code}</span>
        <span className="text-white/40">—</span>
        {custom ? (
          <span className="text-white font-medium">{custom}</span>
        ) : (
          <>
            <span className="text-white">{label}</span>
            {desc && (
              <>
                <span className="text-white/40">·</span>
                <span className="text-white/80 font-medium">{desc}</span>
              </>
            )}
          </>
        )}
      </span>
    )
  }

  const renderLine = (line: MarqueeLine, key: string) => (
    <span key={key} className="inline-flex items-center gap-2 px-6">
      <Megaphone size={12} className="text-white flex-shrink-0" />
      <span className="text-white font-medium">{tField(line.text, line.text_or)}</span>
    </span>
  )

  // One full pass = every coupon, then every custom line. Rendered twice with
  // distinct key prefixes so the animation loops seamlessly without React
  // complaining about duplicate keys.
  const buildPass = (prefix: string) => [
    ...coupons.map((c, i) => renderCoupon(c, `${prefix}-c-${c.id}-${i}`)),
    ...customLines.map((l, i) => renderLine(l, `${prefix}-l-${i}`)),
  ]

  return (
    <div className="bg-gradient-to-r from-primary via-primary-container to-primary text-on-primary text-[11px] font-bold py-2.5 overflow-hidden shadow-3xs">
      <div className="flex whitespace-nowrap animate-marquee">
        {buildPass('a')}
        {buildPass('b')}
      </div>
    </div>
  )
}
