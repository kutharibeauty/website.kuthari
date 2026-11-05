'use client'

import { useT } from '@/hooks/useT'
import Marquee from '@/components/ui/Marquee'
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

/** The periwinkle ticker: live coupon codes and the admin's own lines. */
export default function CouponMarquee({ coupons, customLines = [] }: Props) {
  const { tField } = useT()
  if (!coupons.length && !customLines.length) return null

  const couponLine = (c: CouponItem) => {
    const label = c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`
    // An admin-written line for THIS coupon (migration 030) replaces the
    // auto-composed half; the code still leads, since that's what gets copied.
    const custom = c.marquee_message ? tField(c.marquee_message, c.marquee_message_or ?? null) : null
    const desc = c.description ? tField(c.description, c.description_or) : null
    return `Code ${c.code}: ${custom ?? [label, desc].filter(Boolean).join(', ')}`
  }

  const lines = [...coupons.map(couponLine), ...customLines.map((l) => tField(l.text, l.text_or))]

  return (
    <Marquee
      label={lines.join('. ')}
      items={lines}
      duration={40}
      className="bg-periwinkle py-3 text-ink"
      itemClassName="text-[15px] font-semibold"
      starClassName="h-3.5 w-3.5 text-ink"
    />
  )
}
