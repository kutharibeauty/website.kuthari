import { parseOrderHours, DEFAULT_ORDER_HOURS, type OrderHoursConfig } from '@/lib/store-hours'

// Delivery-fee rule, shared by the cart, checkout and the order route so all
// three agree on what the customer sees and is charged.
//
// Delivery is all-India and priced by DISTANCE, so the destination pincode's
// rate decides the fee:
//
//   1. Subtotal at/above the admin's free-delivery threshold  -> free.
//   2. Otherwise the pincode's own charge, when the admin set one for it.
//      An explicit 0 means genuinely free delivery to that pincode.
//   3. Otherwise DEFAULT_PINCODE_DELIVERY_FEE.
//
// There is no per-product delivery charge: the fee is about where the order
// ships, not what is in the box. (The old products.delivery_charge columns are
// left in the database, unused.)

// Defaults. These are Kuthari Beauty Store's ACTUAL trading terms, not neutral
// placeholders — the admin can still override them in Settings, but with no
// settings row present these are what customers see and are charged, so they
// must match the real policy rather than fall back to something safer.
export const FREE_DELIVERY_MIN = 1999
export const FLAT_DELIVERY_FEE = 99
/** Charged for any pincode the admin has not given an explicit rate. */
export const DEFAULT_PINCODE_DELIVERY_FEE = 99
/** Minimum order subtotal required to check out. Note this is a REAL gate: if
 *  the settings row is missing, customers below it still cannot order — which
 *  is correct, since it is the store's stated minimum. */
export const MIN_ORDER_VALUE = 599

export interface DeliveryConfig {
  /** Order subtotal at/above which delivery is free. */
  freeDeliveryMin: number
  /** Flat fee charged when the subtotal is below the free-delivery threshold. */
  flatDeliveryFee: number
  /** Minimum order subtotal required to check out (0 = no minimum). */
  minOrderValue: number
  /** Admin-set window during which orders may be placed. */
  orderHours: OrderHoursConfig
  /** Whether online (Razorpay) payment is enabled. */
  razorpayEnabled: boolean
  /** Admin switch: offer cash on delivery for the full amount. */
  codEnabled: boolean
  /** Admin switch: when COD is off, bulk orders may pay part online, the rest in cash. */
  bulkPartialEnabled: boolean
  /** Share of a bulk order paid online up front, 10–90 (%). */
  bulkAdvancePercent: number
}

/** How an order is paid. 'partial' = an advance online, the balance in cash on delivery. */
export type PaymentMode = 'online' | 'cod' | 'partial'

/**
 * The payment modes on offer for this order. The checkout shows exactly these
 * and the order route accepts exactly these, so the two can't disagree.
 *  - online: whenever Razorpay is on
 *  - cod: whenever the admin has switched COD on
 *  - partial: bulk orders only, and only while COD is off and Razorpay is on
 */
export function availablePaymentModes(cfg: DeliveryConfig, isBulk: boolean): PaymentMode[] {
  const modes: PaymentMode[] = []
  if (cfg.razorpayEnabled) modes.push('online')
  if (cfg.razorpayEnabled && !cfg.codEnabled && cfg.bulkPartialEnabled && isBulk) modes.push('partial')
  if (cfg.codEnabled) modes.push('cod')
  return modes
}

/** The advance for a part-paid order, in whole rupees (rounded up), never the whole total. */
export function advanceFor(total: number, percent: number): number {
  const pct = Math.min(90, Math.max(10, percent))
  return Math.min(Math.max(0, Math.round(total) - 1), Math.ceil((total * pct) / 100))
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  freeDeliveryMin: FREE_DELIVERY_MIN,
  flatDeliveryFee: FLAT_DELIVERY_FEE,
  minOrderValue: MIN_ORDER_VALUE,
  orderHours: DEFAULT_ORDER_HOURS,
  razorpayEnabled: false,
  codEnabled: false,
  bulkPartialEnabled: false,
  bulkAdvancePercent: 25,
}

/**
 * Read the admin's store thresholds off the `settings` CMS value. Any missing
 * or invalid field falls back to the default, so a partial/absent config can
 * never make delivery free, break, or accidentally impose a minimum.
 */
export function parseDeliveryConfig(settingsValue: unknown): DeliveryConfig {
  if (!settingsValue || typeof settingsValue !== 'object') return DEFAULT_DELIVERY_CONFIG
  const v = settingsValue as Record<string, unknown>
  const min = Number(v.free_delivery_min)
  const fee = Number(v.flat_delivery_fee)
  const minOrder = Number(v.min_order_value)
  return {
    freeDeliveryMin: Number.isFinite(min) && min >= 0 ? min : FREE_DELIVERY_MIN,
    flatDeliveryFee: Number.isFinite(fee) && fee >= 0 ? fee : FLAT_DELIVERY_FEE,
    minOrderValue: Number.isFinite(minOrder) && minOrder >= 0 ? minOrder : MIN_ORDER_VALUE,
    orderHours: parseOrderHours(settingsValue),
    razorpayEnabled: v.razorpay_enabled === true,
    codEnabled: v.cod_enabled === true,
    bulkPartialEnabled: v.bulk_partial_enabled === true,
    bulkAdvancePercent: (() => {
      const p = Number(v.bulk_advance_percent)
      return Number.isFinite(p) ? Math.min(90, Math.max(10, Math.round(p))) : 25
    })(),
  }
}

/**
 * The delivery fee to display AND charge for a cart/order — the single rule the
 * cart, checkout and order route all share.
 *
 * `pincodeCharge` is the destination pincode's admin-set rate: a number
 * (including 0, meaning free to that pincode) when one is on file, or
 * null/undefined when the pincode is unknown or not yet loaded — in which case
 * the default rate applies.
 */
export function computeDeliveryFee(
  subtotal: number,
  pincodeCharge: number | null | undefined,
  config: DeliveryConfig = DEFAULT_DELIVERY_CONFIG,
): number {
  // Free-delivery threshold beats every per-pincode rate.
  if (subtotal >= config.freeDeliveryMin) return 0
  // `0` is a real rate (free to this pincode), so check for null/undefined and
  // non-finite values explicitly rather than truthiness.
  const rate = Number(pincodeCharge)
  if (pincodeCharge != null && Number.isFinite(rate) && rate >= 0) return rate
  return DEFAULT_PINCODE_DELIVERY_FEE
}
