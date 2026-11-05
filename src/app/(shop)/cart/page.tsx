'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import EmptyState from '@/components/ui/EmptyState'
import { useRouter } from 'next/navigation'
import {
  Minus, Plus, Trash2, ShoppingBag, Tag, X,
  ArrowRight, ShieldCheck, Truck,
  Package, ChevronRight, BadgeCheck,
} from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { computeDeliveryFee } from '@/lib/cart/delivery'
import { readSavedPincode } from '@/lib/cart/pincode-storage'
import { useDeliveryConfig } from '@/hooks/useDeliveryConfig'
import { useStoreOpen } from '@/hooks/useStoreOpen'
import { formatMinute } from '@/lib/store-hours'
import CartCouponPicker from '@/components/cart/CartCouponPicker'
import type { CartItem } from '@/types/database.types'

interface CouponData {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'flat'
  discount_value: number
  min_order_value: number | null
  max_discount: number | null
  max_uses: number | null
  uses_count: number | null
  valid_until: string | null
}

// ── CartItemRow ───────────────────────────────────────────────────────────────
function CartItemRow({ item, onQtyChange, onRemove }: {
  item: CartItem
  onQtyChange: (qty: number) => void
  onRemove: () => void
}) {
  return (
    <div className="bg-surface-card rounded-2xl border-2 border-table-border flex gap-4 p-4 items-center group hover:border-primary/30 transition-colors duration-200">
      {/* Image */}
      <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl bg-surface-container-low border-2 border-table-border flex-shrink-0 overflow-hidden relative">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover mix-blend-multiply"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package size={28} className="text-on-surface-variant/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-grow flex flex-col gap-2.5 min-w-0">
        <div>
          <h4 className="text-sm font-black text-primary leading-snug line-clamp-2">
            {item.name}
          </h4>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="inline-block text-[12px] font-black text-on-surface-variant/60 border border-table-border rounded-full px-2 py-0.5">
              {item.unit}
            </span>
            {(item.min_qty ?? 1) > 1 && (
              <span className="inline-block text-[12px] font-bold text-on-secondary-container bg-secondary-container rounded-full px-2 py-0.5">
                Bulk price: min {item.min_qty}
              </span>
            )}
            {item.units_each && item.units_each > 1 && (
              <span className="inline-block text-[12px] font-black text-primary bg-primary/8 rounded-full px-2 py-0.5">
                {(item.quantity * item.units_each).toLocaleString('en-IN')} units total
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {/* Price */}
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-base font-black text-primary">
              ₹{item.price.toLocaleString('en-IN')}
            </span>
            {item.mrp && item.mrp > item.price && (
              <span className="text-xs text-on-surface-variant/40 line-through">₹{item.mrp}</span>
            )}
          </div>

          {/* Qty stepper */}
          <div className="flex flex-shrink-0 items-center h-9 bg-primary text-white rounded-xl overflow-hidden border-2 border-primary">
            <button
              // Below a bulk minimum the line is removed instead of left at a
              // price the customer no longer qualifies for.
              onClick={() => onQtyChange(item.quantity - 1 < (item.min_qty ?? 1) ? 0 : item.quantity - 1)}
              className="w-9 h-full flex items-center justify-center hover:bg-white/15 transition-colors active:scale-90"
              aria-label="Decrease"
            >
              <Minus size={14} strokeWidth={3} />
            </button>
            <input
              type="number"
              min={item.min_qty ?? 1}
              value={item.quantity}
              onChange={(e) => { const n = parseInt(e.target.value, 10); const min = item.min_qty ?? 1; onQtyChange(Number.isNaN(n) || n < min ? min : n) }}
              aria-label="Quantity"
              className="w-10 text-center text-sm font-black bg-transparent text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => onQtyChange(item.quantity + 1)}
              className="w-9 h-full flex items-center justify-center hover:bg-white/15 transition-colors active:scale-90"
              aria-label="Increase"
            >
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-2 rounded-xl border-2 border-transparent hover:border-error/30 hover:bg-error/5 text-on-surface-variant/40 hover:text-error transition duration-200"
        aria-label="Remove item"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

// ── CouponInputSection ────────────────────────────────────────────────────────
function CouponInputSection({
  couponInput, setCouponInput, appliedCoupon,
  onApply, onRemove, error, loading,
}: {
  couponInput: string
  setCouponInput: (v: string) => void
  appliedCoupon: CouponData | null
  onApply: () => void
  onRemove: () => void
  error: string
  loading: boolean
}) {
  if (appliedCoupon) {
    return (
      <div className="relative overflow-hidden bg-surface-card rounded-2xl border-2 border-primary p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <BadgeCheck size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-primary">
              {appliedCoupon.code} applied
            </p>
            {appliedCoupon.description && (
              <p className="text-xs text-on-surface-variant/60 mt-0.5 font-medium">
                {appliedCoupon.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="relative z-10 text-[11px] font-black text-on-surface-variant border-2 border-table-border rounded-xl px-3 py-1.5 hover:border-error/40 hover:text-error transition duration-200 flex items-center gap-1 flex-shrink-0"
        >
          <X size={11} /> Remove
        </button>
      </div>
    )
  }

  return (
    <div className="bg-surface-card rounded-2xl border-2 border-table-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={15} className="text-primary" strokeWidth={2.5} />
        <span className="text-[11px] font-black text-primary">Apply Coupon</span>
      </div>
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          value={couponInput}
          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && onApply()}
          placeholder="ENTER CODE"
          className="flex-1 min-w-0 border-2 border-table-border focus:border-primary rounded-xl px-4 py-2.5 text-base bg-surface-container-low placeholder:text-on-surface-variant/50 focus:outline-none transition-colors font-bold uppercase"
        />
        <button
          onClick={onApply}
          disabled={!couponInput.trim() || loading}
          className="shrink-0 whitespace-nowrap px-5 bg-primary text-white text-[11px] font-black rounded-xl border-2 border-primary hover:bg-primary/90 transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
        >
          {loading ? '...' : 'Apply'}
        </button>
      </div>
      {error && (
        <p className="text-xs font-bold text-error mt-2 flex items-center gap-1.5">
          <X size={12} /> {error}
        </p>
      )}
    </div>
  )
}

// ── OrderSummaryCard ──────────────────────────────────────────────────────────
function OrderSummaryCard({
  subtotal, discount, deliveryFee, total, totalQty, itemCount, couponCode,
}: {
  subtotal: number; discount: number; deliveryFee: number
  total: number; totalQty: number; itemCount: number; couponCode?: string
}) {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <section className="relative bg-primary rounded-2xl p-5 overflow-hidden">

      <div className="relative z-10">
        <p className="text-[12px] font-black text-white/40 mb-4">
          Order Summary
        </p>

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-white/60 font-medium">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · {totalQty} qty
            </span>
            <span className="text-white font-black">{fmt(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-white/60 font-medium">
                Coupon {couponCode ? `(${couponCode})` : 'Discount'}
              </span>
              <span className="text-white font-black">-{fmt(discount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pb-3 border-b border-white/15">
            <span className="text-white/60 font-medium">Delivery</span>
            <div className="flex items-center gap-2">
              {deliveryFee === 0 ? (
                <>
                  <span className="line-through text-white/30 text-xs">₹50.00</span>
                  <span className="text-white font-black text-xs">Free</span>
                </>
              ) : (
                <span className="text-white font-black">{fmt(deliveryFee)}</span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-end pt-1">
            <span className="font-black text-white/70 text-xs">Grand Total</span>
            <span className="font-black text-white text-2xl">{fmt(total)}</span>
          </div>
        </div>

        {/* Payment badge */}
        <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/15">
          <span className="text-[12px] font-black text-white bg-white/20 px-2 py-0.5 rounded-full">Secure</span>
          <span className="text-xs text-white/50 font-medium">Online payment via UPI, Card &amp; Net Banking</span>
        </div>
      </div>
    </section>
  )
}

// ── Empty Cart State ──────────────────────────────────────────────────────────
function EmptyCart() {
  return (
    <EmptyState
      art="bag"
      title="Your bag is empty"
      accent="for now."
      text="Pick a single piece at retail price, or a whole box at bulk price."
      action={{ href: '/', label: 'Start shopping' }}
      secondary={{ href: '/search', label: 'Browse every aisle' }}
    />
  )
}

// ── Main CartPage ─────────────────────────────────────────────────────────────
export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice, setCoupon } = useCartStore()
  const { isSignedIn } = useSupabaseUser()
  const deliveryConfig = useDeliveryConfig()
  const storeOpen = useStoreOpen()
  const router = useRouter()

  // Delivery rate for the pincode the customer last checked in the header.
  // undefined until read on mount (localStorage is client-only), which
  // computeDeliveryFee treats the same as "no rate on file" → default.
  const [savedPincodeCharge, setSavedPincodeCharge] = useState<number | null>(null)
  useEffect(() => {
    setSavedPincodeCharge(readSavedPincode()?.result.delivery_charge ?? null)
  }, [])

  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  // Persist the applied coupon so checkout can send it with the order.
  useEffect(() => {
    setCoupon(appliedCoupon?.code ?? null)
  }, [appliedCoupon, setCoupon])

  const subtotal = totalPrice()
  const discount = (() => {
    if (!appliedCoupon) return 0
    // Below the coupon's minimum it earns nothing. The effect below also drops
    // the coupon, but guard here so the total is never briefly wrong while the
    // cart is being edited.
    if (appliedCoupon.min_order_value != null && subtotal < appliedCoupon.min_order_value) return 0
    let d =
      appliedCoupon.discount_type === 'percentage'
        ? Math.round((subtotal * appliedCoupon.discount_value) / 100)
        : appliedCoupon.discount_value
    // Cap percentage discounts at max_discount when set.
    if (appliedCoupon.max_discount && d > appliedCoupon.max_discount) {
      d = appliedCoupon.max_discount
    }
    // Never discount more than the subtotal.
    return Math.min(d, subtotal)
  })()

  // A coupon stays applied while the cart is edited. If the customer removes
  // items and falls below its minimum, take it off and say why — otherwise the
  // cart would keep showing a coupon the order route rejects at checkout.
  useEffect(() => {
    if (!appliedCoupon) return
    const min = appliedCoupon.min_order_value
    if (min != null && subtotal < min) {
      setAppliedCoupon(null)
      setCouponError(
        `${appliedCoupon.code} removed — it needs a minimum order of ₹${min.toLocaleString('en-IN')}`,
      )
    }
  }, [subtotal, appliedCoupon])
  // Per-product delivery charges (if any) override the flat free-above-threshold
  // fee. When a fixed charge applies, the "add more for free delivery" prompt
  // doesn't make sense, so it's hidden.
  // Estimate using the pincode the customer last checked in the header. The
  // real charge is recomputed at checkout from the selected address, and again
  // server-side when the order is placed.
  const deliveryFee = computeDeliveryFee(subtotal, savedPincodeCharge, deliveryConfig)
  const total = Math.max(0, subtotal - discount) + deliveryFee
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  // Minimum-order gate (admin-set, 0 = none). Checkout is blocked until the
  // subtotal reaches it; the order route enforces the same rule authoritatively.
  const minOrderValue = deliveryConfig.minOrderValue
  const belowMinOrder = minOrderValue > 0 && subtotal < minOrderValue
  const amountToMin = belowMinOrder ? minOrderValue - subtotal : 0
  // Checkout is blocked either below the minimum order or outside store hours.
  const checkoutDisabled = belowMinOrder || !storeOpen
  const goToCheckout = () => { if (!checkoutDisabled) router.push('/checkout') }
  const openLabel = formatMinute(deliveryConfig.orderHours.openMinute)
  const closeLabel = formatMinute(deliveryConfig.orderHours.closeMinute)

  const syncRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (!isSignedIn || items.length === 0) return
    clearTimeout(syncRef.current)
    syncRef.current = setTimeout(() => {
      fetch('/api/abandoned-carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }).catch(() => {})
    }, 2000)
    return () => clearTimeout(syncRef.current)
  }, [items, isSignedIn])

  // Split out so a coupon TAPPED from the list can reuse the exact same
  // validation as the typed code. Kept separate from handleApplyCoupon so the
  // button's click event is never mistaken for a code.
  const applyCouponCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim()
    if (!code) return
    setCouponLoading(true)
    setCouponError('')
    try {
      // Validate server-side: the public coupon list can only show the GLOBAL
      // cap, so checking here missed the per-customer cap and the customer only
      // found out when placing the order. This runs the same rules the order
      // route runs, including how many times THIS customer has already used it.
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; error?: string; coupon?: CouponData
      }
      if (!res.ok || !data.ok || !data.coupon) {
        setCouponError(data.error || 'Invalid coupon code')
      } else {
        setAppliedCoupon(data.coupon)
        setCouponInput('')
      }
    } catch {
      setCouponError('Could not validate coupon. Try again.')
    } finally {
      setCouponLoading(false)
    }
  }, [subtotal])

  const handleApplyCoupon = useCallback(
    () => applyCouponCode(couponInput),
    [applyCouponCode, couponInput],
  )

  if (items.length === 0) return <EmptyCart />

  return (
    <div className="min-h-screen">
      {/* ── Page hero strip ── */}
      <div className="relative overflow-hidden bg-primary border-b-2 border-primary mb-6">
        <div className="relative z-10 px-4 max-w-5xl mx-auto py-7 md:py-9">
          <span className="text-[11px] font-black text-white/40 mb-2 block">
            Your Order
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-xs text-white/45 font-medium mt-0.5">
            {items.length} {items.length === 1 ? 'item' : 'items'} · ₹{subtotal.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-36 lg:pb-10 lg:flex lg:gap-6">
        {/* ── LEFT column ── */}
        <div className="lg:flex-1 flex flex-col gap-4">

          {/* Free delivery banner. The threshold beats every per-pincode rate,
              so "add more for free delivery" is always achievable. */}
          {deliveryFee === 0 ? (
            <div className="flex items-center gap-3 border-2 border-primary/30 bg-primary/5 rounded-2xl p-3.5">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                <Truck size={15} className="text-white" />
              </div>
              <p className="text-sm font-black text-primary">
                Free Delivery Unlocked!
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-2 border-table-border rounded-2xl p-3.5 text-sm">
              <Truck size={16} className="text-on-surface-variant/50 flex-shrink-0" />
              <span className="font-medium text-on-surface-variant/70">
                Add <span className="font-black text-primary">₹{(deliveryConfig.freeDeliveryMin - subtotal).toLocaleString('en-IN')}</span> more for Free Delivery
              </span>
            </div>
          )}

          {/* Items list */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-table-border" />
              <span className="text-[12px] font-black text-on-surface-variant/40">
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </span>
              <div className="h-px flex-1 bg-table-border" />
            </div>
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onQtyChange={(qty) => updateQuantity(item.id, qty)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          </section>

          {/* Coupon */}
          <CouponInputSection
            couponInput={couponInput}
            setCouponInput={setCouponInput}
            appliedCoupon={appliedCoupon}
            onApply={handleApplyCoupon}
            onRemove={() => { setAppliedCoupon(null); setCouponError('') }}
            error={couponError}
            loading={couponLoading}
          />

          {/* Tap-to-apply list of the coupons this customer can actually use.
              Hides itself when there's nothing to offer. */}
          <CartCouponPicker
            subtotal={subtotal}
            appliedCode={appliedCoupon?.code ?? null}
            onApply={applyCouponCode}
          />
        </div>

        {/* ── RIGHT column ── */}
        <div className="lg:w-72 mt-4 lg:mt-0">
          <div className="lg:sticky lg:top-20 flex flex-col gap-4">
            <OrderSummaryCard
              subtotal={subtotal}
              discount={discount}
              deliveryFee={deliveryFee}
              total={total}
              totalQty={totalQty}
              itemCount={items.length}
              couponCode={appliedCoupon?.code}
            />

            {/* Checkout-blocked notice (desktop) — closed hours take priority */}
            {!storeOpen ? (
              <p className="hidden lg:block text-center text-xs font-black text-error bg-error/10 border-2 border-error/20 rounded-xl py-2.5 px-3">
                Orders are accepted only between {openLabel} and {closeLabel}. Please order during store hours.
              </p>
            ) : belowMinOrder ? (
              <p className="hidden lg:block text-center text-xs font-black text-error bg-error/10 border-2 border-error/20 rounded-xl py-2.5 px-3">
                Minimum order ₹{minOrderValue.toLocaleString('en-IN')}. Add ₹{amountToMin.toLocaleString('en-IN')} more to check out.
              </p>
            ) : null}

            {/* Desktop checkout CTA */}
            <button
              onClick={goToCheckout}
              disabled={checkoutDisabled}
              className="hidden lg:flex w-full bg-primary text-white font-black text-sm py-4 rounded-2xl items-center justify-center gap-2 hover:bg-primary/90 transition duration-200 active:scale-95 shadow-sm border-2 border-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Proceed to Checkout
              <ArrowRight size={17} strokeWidth={2.5} />
            </button>

            {/* Trust badges */}
            <div className="hidden lg:flex justify-center gap-5 text-on-surface-variant/40 mt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-black">
                <ShieldCheck size={13} strokeWidth={2.5} /> Secure
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-black">
                <ShoppingBag size={13} strokeWidth={2.5} /> Bulk
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile sticky checkout bar ── */}
        <div className="lg:hidden fixed bottom-16 inset-x-0 bg-primary border-t-2 border-primary px-4 py-3 shadow-[var(--shadow-modal)] z-40">
          {!storeOpen ? (
            <p className="max-w-lg mx-auto mb-2 text-center text-[11px] font-black text-white bg-error/30 border border-error/40 rounded-lg py-1.5 px-2">
              Orders open {openLabel}–{closeLabel} — currently closed
            </p>
          ) : belowMinOrder ? (
            <p className="max-w-lg mx-auto mb-2 text-center text-[11px] font-black text-white bg-error/30 border border-error/40 rounded-lg py-1.5 px-2">
              Min order ₹{minOrderValue.toLocaleString('en-IN')} — add ₹{amountToMin.toLocaleString('en-IN')} more
            </p>
          ) : null}
          <div className="flex justify-between items-center max-w-lg mx-auto gap-4">
            <div>
              <span className="text-[11px] font-black text-white/40 block">
                Total to pay
              </span>
              <span className="text-lg font-black text-white">
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <button
              onClick={goToCheckout}
              disabled={checkoutDisabled}
              className="flex-shrink-0 bg-white text-primary font-black text-sm px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-white/90 transition duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              Checkout <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
