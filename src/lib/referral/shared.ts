// Pure referral logic — NO server-only imports (safe for client components).
// The server-only reader lives in ./config.ts.

export type DiscountType = 'percentage' | 'flat'

export interface ReferralConfig {
  enabled: boolean
  /** Reward for the person who shared the code (the referrer/giver). */
  referrer_type: DiscountType
  referrer_value: number
  /** Discount for the new customer redeeming the code (the referee/taker). */
  referee_type: DiscountType
  referee_value: number
  /** Minimum order subtotal for the referee to redeem. */
  min_order_value: number | null
  /** Cap for percentage discounts/rewards (₹). */
  max_discount: number | null
}

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  enabled: false,
  referrer_type: 'flat',
  referrer_value: 0,
  referee_type: 'flat',
  referee_value: 0,
  min_order_value: null,
  max_discount: null,
}

function applyDiscount(base: number, type: DiscountType, value: number, maxDiscount: number | null): number {
  if (!value || value <= 0) return 0
  let d = type === 'percentage' ? Math.round((base * value) / 100) : value
  if (maxDiscount != null && d > maxDiscount) d = maxDiscount
  return Math.max(0, Math.min(d, base))
}

/** Discount the referee (taker) gets on their order subtotal. */
export function computeRefereeDiscount(subtotal: number, cfg: ReferralConfig): number {
  if (!cfg.enabled) return 0
  return applyDiscount(subtotal, cfg.referee_type, cfg.referee_value, cfg.max_discount)
}

/** Reward the referrer (giver) earns, based on the referee's order subtotal. */
export function computeReferrerReward(refereeSubtotal: number, cfg: ReferralConfig): number {
  if (!cfg.enabled) return 0
  return applyDiscount(refereeSubtotal, cfg.referrer_type, cfg.referrer_value, cfg.max_discount)
}

/** Short human blurb of what a referral is worth, e.g. "Give ₹100, Get ₹100". */
export function referralBenefitText(cfg: ReferralConfig): string {
  const fmt = (t: DiscountType, v: number) => (t === 'percentage' ? `${v}%` : `₹${v}`)
  return `Give ${fmt(cfg.referee_type, cfg.referee_value)}, Get ${fmt(cfg.referrer_type, cfg.referrer_value)}`
}
