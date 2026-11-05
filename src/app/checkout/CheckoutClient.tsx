'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Package, MapPin,
  Truck, Wallet, Plus, Pencil, ShieldCheck, Mail, Receipt, Gift,
} from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { computeDeliveryFee } from '@/lib/cart/delivery'
import { useDeliveryConfig } from '@/hooks/useDeliveryConfig'
import { useStoreOpen } from '@/hooks/useStoreOpen'
import { formatMinute } from '@/lib/store-hours'
import { cn } from '@/lib/utils'
import PincodeChecker from '@/components/checkout/PincodeChecker'
import PaymentOptions from '@/components/checkout/PaymentOptions'
import { availablePaymentModes, advanceFor, type PaymentMode } from '@/lib/cart/delivery'
import { RETAIL_LABEL } from '@/lib/products/packaging'
import AddressForm from '@/components/checkout/AddressForm'
import { Skeleton, AddressCardSkeleton } from '@/components/ui/Skeleton'
import { isValidGstin } from '@/lib/validations/gst'
import Logo from '@/components/layout/Logo'
import type { Address } from '@/types/database.types'

interface Props { profileId: string; initialEmail?: string }

interface PincodeResult {
  serviceable: boolean
  city?: string
  state?: string
  delivery_days?: number
  /** Admin-set rate for this pincode. null = none on file, use the default. */
  delivery_charge?: number | null
}

export default function CheckoutClient({ profileId, initialEmail = '' }: Props) {
  const router = useRouter()
  // True once the order is placed, so clearing the cart can't bounce the
  // customer home before the success page loads. A ref, not state: it must be
  // readable by the effect on the very next render, without scheduling another.
  const orderPlacedRef = useRef(false)
  const deliveryConfig = useDeliveryConfig()
  const storeOpen = useStoreOpen()
  const items     = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const removeItem = useCartStore((s) => s.removeItem)
  const totalItems = useCartStore((s) => s.totalItems)
  const totalPrice = useCartStore((s) => s.totalPrice)
  const couponCode = useCartStore((s) => s.couponCode)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pincodeResult, setPincodeResult] = useState<PincodeResult | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [gstEnabled, setGstEnabled] = useState(false)
  const [gstin, setGstin] = useState('')
  const [gstBusinessName, setGstBusinessName] = useState('')
  const [notes, setNotes] = useState('')
  // Transport / bus: pick an admin-set vehicle or type custom details.
  const [vehicles, setVehicles] = useState<{ id: string; number: string; name: string | null; phone: string | null }[]>([])
  const [transportChoice, setTransportChoice] = useState('') // '' | vehicle id | 'custom'
  const [transportCustom, setTransportCustom] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/delivery-vehicles')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (active && Array.isArray(d)) setVehicles(d) })
      .catch(() => { /* transport is optional */ })
    return () => { active = false }
  }, [])

  // The text snapshot stored on the order and shown on the invoice.
  const transportDetails = (() => {
    if (transportChoice === 'custom') return transportCustom.trim() || null
    const v = vehicles.find((x) => x.id === transportChoice)
    return v ? [v.number, v.name, v.phone].filter(Boolean).join(' · ') : null
  })()
  const [email, setEmail] = useState(initialEmail)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [validCouponCode, setValidCouponCode] = useState<string | null>(null)
  // Referral: field the referee enters + the buyer's own auto-applied credit.
  const [referralInput, setReferralInput] = useState('')
  const [referralApplied, setReferralApplied] = useState<{ code: string; type: 'percentage' | 'flat'; value: number; max: number | null } | null>(null)
  const [referralError, setReferralError] = useState('')
  const [referralChecking, setReferralChecking] = useState(false)
  const [referralEligible, setReferralEligible] = useState(false)
  // The buyer's OWN referrer reward is count-based now: one use per person who
  // ordered with their code. This holds the per-use discount shape when they have
  // a use left (else null); the server re-checks and consumes a use at order time.
  const [myReferrerReward, setMyReferrerReward] = useState<{ type: 'percentage' | 'flat'; value: number; max: number | null } | null>(null)

  const selectedAddress = addresses.find((a) => a.id === selectedId) ?? null
  const subtotal = totalPrice()
  const referralDiscount = referralApplied
    ? Math.max(0, Math.min(
        referralApplied.type === 'percentage'
          ? (referralApplied.max != null
              ? Math.min(Math.round(subtotal * referralApplied.value / 100), referralApplied.max)
              : Math.round(subtotal * referralApplied.value / 100))
          : referralApplied.value,
        subtotal,
      ))
    : 0
  // One use of the buyer's own referrer reward, if any left. Kept in `creditApplied`
  // so the summary line and totals below are unchanged.
  const referrerRewardValue = myReferrerReward
    ? (myReferrerReward.type === 'percentage'
        ? (myReferrerReward.max != null
            ? Math.min(Math.round(subtotal * myReferrerReward.value / 100), myReferrerReward.max)
            : Math.round(subtotal * myReferrerReward.value / 100))
        : myReferrerReward.value)
    : 0
  const creditApplied = Math.min(referrerRewardValue, Math.max(0, subtotal - couponDiscount - referralDiscount))
  // Same rule as the cart and the order route: per-product charge if any, else
  // free at/above the admin threshold, else the flat fee. (Previously this only
  // summed per-product charges, so it showed FREE for sub-threshold orders while
  // the cart showed the flat fee.) The server recomputes it authoritatively.
  const deliveryFee = computeDeliveryFee(subtotal, pincodeResult?.delivery_charge ?? null, deliveryConfig)
  const grandTotal = Math.max(0, subtotal - couponDiscount - referralDiscount - creditApplied) + deliveryFee
  // Address + serviceability gate the button. The email is captured in a popup
  // at "Place Order" (PRD #3/#4) — every order/status update is sent to it.
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  // A GST invoice is optional, but if requested the GSTIN + business name must be valid.
  const gstOk = !gstEnabled || (isValidGstin(gstin) && gstBusinessName.trim().length >= 2)
  // Minimum-order gate (admin-set, 0 = none). The order route enforces this too.
  const minOrderValue = deliveryConfig.minOrderValue
  const belowMinOrder = minOrderValue > 0 && subtotal < minOrderValue
  // Payment: what the admin has switched on and what this order qualifies for.
  // A bulk order has any line above the single-piece retail option; the order
  // route decides this again from the database.
  const isBulkOrder = items.some((i) => i.variant !== RETAIL_LABEL)
  const paymentModes = availablePaymentModes(deliveryConfig, isBulkOrder)
  const [chosenMode, setChosenMode] = useState<PaymentMode | null>(null)
  const payMode: PaymentMode | null = chosenMode && paymentModes.includes(chosenMode) ? chosenMode : (paymentModes[0] ?? null)
  const cashTotal = Math.round(grandTotal)
  const advance = advanceFor(cashTotal, deliveryConfig.bulkAdvancePercent)
  // Delivery is all-India, so the destination never blocks checkout; the
  // pincode lookup only decides the delivery charge.
  const canPlace = !!selectedId && gstOk && !belowMinOrder && storeOpen && payMode !== null
  const openLabel = formatMinute(deliveryConfig.orderHours.openMinute)
  const closeLabel = formatMinute(deliveryConfig.orderHours.closeMinute)

  // Re-validate the applied coupon here and compute the discount authoritatively
  // for display (the order API re-checks it server-side too).
  useEffect(() => {
    if (!couponCode || subtotal <= 0) { setCouponDiscount(0); setValidCouponCode(null); return }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/coupons')
        if (!res.ok) return
        const data: Array<{
          code: string; discount_type: 'percentage' | 'flat'; discount_value: number
          min_order_value: number | null; max_discount: number | null
          max_uses: number | null; uses_count: number | null; valid_until: string | null
        }> = await res.json()
        const c = data.find((x) => x.code.toUpperCase() === couponCode.toUpperCase())
        const expired = !!c?.valid_until && new Date(c.valid_until) < new Date()
        const usedUp = c?.max_uses != null && (c.uses_count ?? 0) >= c.max_uses
        const belowMin = c?.min_order_value != null && subtotal < c.min_order_value
        if (!c || expired || usedUp || belowMin) {
          if (!cancelled) { setCouponDiscount(0); setValidCouponCode(null) }
          return
        }
        let d = c.discount_type === 'percentage'
          ? Math.round((subtotal * c.discount_value) / 100)
          : c.discount_value
        if (c.max_discount != null && d > c.max_discount) d = c.max_discount
        d = Math.min(d, subtotal)
        if (!cancelled) { setCouponDiscount(d); setValidCouponCode(c.code) }
      } catch {
        if (!cancelled) { setCouponDiscount(0); setValidCouponCode(null) }
      }
    })()
    return () => { cancelled = true }
  }, [couponCode, subtotal])

  // Load addresses via the server API — the `addresses` table is service-role
  // only, so the browser client can't read it (permission denied).
  useEffect(() => {
    // An empty cart means the customer wandered in with nothing to buy — send
    // them home. But NOT right after a successful order: placeOrder clears the
    // cart, which re-runs this effect, and the redirect then raced (and beat)
    // the push to the order-success page. Placing an order is the one time the
    // cart is legitimately empty here.
    if (orderPlacedRef.current) return
    if (items.length === 0) { router.replace('/'); return }
    void (async () => {
      try {
        const res = await fetch('/api/addresses')
        const rows = (res.ok ? await res.json() : []) as Address[]
        setAddresses(rows)
        const def = rows.find((a) => a.is_default) ?? rows[0]
        if (def) setSelectedId(def.id)
      } finally {
        setLoadingAddresses(false)
      }
    })()
  }, [items.length, router])

  // Referral status: the buyer's own accrued credit + whether they can still
  // redeem someone's code (new customers, first order).
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/referral/me')
        if (!res.ok) return
        const d = await res.json() as {
          referrerReward?: { type: 'percentage' | 'flat'; value: number; max: number | null } | null
          eligibleForReferee?: boolean; enabled?: boolean
        }
        setMyReferrerReward(d.referrerReward ?? null)
        setReferralEligible(!!d.enabled && !!d.eligibleForReferee)
      } catch { /* ignore */ }
    })()
  }, [])

  const applyReferral = async () => {
    const code = referralInput.trim()
    if (!code) return
    // A coupon and a referral code are mutually exclusive (the server enforces
    // this too). The input is normally hidden when a coupon is applied; this is
    // the belt-and-suspenders guard.
    if (couponDiscount > 0) { setReferralError('Remove the coupon to use a referral code.'); return }
    setReferralChecking(true); setReferralError('')
    try {
      const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}`)
      const d = await res.json() as { valid: boolean; message?: string; code?: string; referee_type?: 'percentage' | 'flat'; referee_value?: number; max_discount?: number | null }
      if (!d.valid) { setReferralApplied(null); setReferralError(d.message ?? 'Invalid referral code.'); return }
      setReferralApplied({ code: d.code!, type: d.referee_type ?? 'flat', value: d.referee_value ?? 0, max: d.max_discount ?? null })
      setReferralError('')
    } catch {
      setReferralError('Could not check the code. Try again.')
    } finally {
      setReferralChecking(false)
    }
  }

  // Switching address invalidates the looked-up delivery charge until the new
  // address's pincode is re-checked.
  useEffect(() => {
    setPincodeResult(null)
  }, [selectedId])

  // Clicking "Place Order" opens the email popup first — the customer must enter
  // an active email that all order/status update emails will be delivered to.
  const requestPlaceOrder = () => {
    if (!canPlace || isPlacing) return
    setError('')
    setShowEmailModal(true)
  }

  // The common order body — reused by both phases of online payment.
  const buildOrderBody = (extra?: Record<string, unknown>) => ({
    address_id: selectedId,
    items,
    notes: notes.trim() || undefined,
    transport_details: transportDetails || undefined,
    coupon_code: validCouponCode || undefined,
    email: email.trim() || undefined,
    gstin: gstEnabled ? gstin.trim().toUpperCase() || undefined : undefined,
    gst_business_name: gstEnabled ? gstBusinessName.trim() || undefined : undefined,
    referral_code: referralApplied?.code || undefined,
    payment_method: payMode ?? undefined,
    ...extra,
  })

  // POST to /api/orders. Returns the parsed JSON on success, or null when a
  // recoverable error was already surfaced to the customer. Throws otherwise.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submitOrder = async (extra?: Record<string, unknown>): Promise<any | null> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildOrderBody(extra)),
    })
    const json = await res.json()
    if (!res.ok) {
      // Stale cart — a product was deleted/deactivated. Drop those items so
      // the customer can retry with what's still available.
      if (json.error_code === 'items_unavailable' && Array.isArray(json.unavailable_ids)) {
        const names = items.filter((i) => json.unavailable_ids.includes(i.id)).map((i) => i.name)
        json.unavailable_ids.forEach((id: string) => removeItem(id))
        setError(
          names.length
            ? `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} no longer available and ${names.length === 1 ? 'was' : 'were'} removed from your cart. Please review your order and try again.`
            : (json.error ?? 'Some items are no longer available.'),
        )
        return null
      }
      // Referral no longer valid — clear it so they can place the order without it.
      if (json.error_code === 'referral_invalid') {
        setReferralApplied(null)
        setReferralError(json.error ?? 'Referral code could not be applied.')
        setError('Your referral code could not be applied. It has been removed. Please place your order again.')
        return null
      }
      throw new Error(json.detail ? `${json.error}: ${json.detail}` : (json.error ?? 'Failed to place order'))
    }
    return json
  }

  const finishOrder = (orderId: string) => {
    // Set BEFORE clearCart so the empty-cart redirect can't fire.
    orderPlacedRef.current = true
    clearCart()
    router.push(`/orders/${orderId}?new=1`)
  }

  // Load Razorpay Checkout's script on demand (once).
  const loadRazorpay = (): Promise<boolean> =>
    new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).Razorpay) return resolve(true)
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = () => resolve(true)
      s.onerror = () => resolve(false)
      document.body.appendChild(s)
    })

  const placeOnlineOrder = async () => {
    // Phase 1 — ask the server to create a Razorpay order for the exact amount.
    const start = await submitOrder()
    if (!start) { setIsPlacing(false); return }
    if (!start.needs_payment || !start.razorpay) {
      if (start.order_id) return finishOrder(start.order_id)
      throw new Error('Could not start online payment')
    }
    const ok = await loadRazorpay()
    if (!ok) {
      setError('Could not load the payment window. Check your connection and try again.')
      setIsPlacing(false)
      return
    }
    const addr = addresses.find((a) => a.id === selectedId)
    const rz = start.razorpay
    const options = {
      key: rz.key_id,
      order_id: rz.order_id,
      amount: rz.amount,
      currency: rz.currency,
      name: 'Kuthari Beauty Store',
      description: payMode === 'partial' ? 'Advance for your bulk order' : 'Order payment',
      prefill: { email: email.trim(), name: addr?.name || '', contact: addr?.phone || '' },
      theme: { color: '#292966' },
      // UPI first: most customers here pay by UPI, so put it at the top and keep
      // every other method below it.
      config: {
        display: {
          blocks: {
            upi: { name: 'Pay by UPI', instruments: [{ method: 'upi' }] },
          },
          sequence: ['block.upi'],
          preferences: { show_default_blocks: true },
        },
      },
      // Let a failed payment be retried in the same window, remember the
      // customer's saved cards, and auto-read the OTP on Android.
      retry: { enabled: true, max_count: 3 },
      remember_customer: true,
      send_sms_hash: true,
      notes: { order_mode: payMode },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: async (resp: any) => {
        // Phase 2 — verify the payment server-side, which creates the order.
        try {
          const done = await submitOrder({
            razorpay: {
              order_id: resp.razorpay_order_id,
              payment_id: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
            },
          })
          if (!done) { setIsPlacing(false); return }
          finishOrder(done.order_id)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Payment succeeded but the order could not be finalized. Please contact support.')
          setIsPlacing(false)
        }
      },
      modal: {
        ondismiss: () => {
          setError('Payment cancelled. You can try again.')
          setIsPlacing(false)
        },
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzp = new (window as any).Razorpay(options)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rzp.on('payment.failed', (r: any) => {
      setError(r?.error?.description || 'Payment failed. Please try again.')
      setIsPlacing(false)
    })
    rzp.open()
  }

  const placeOrder = async () => {
    if (!canPlace || !emailValid) return
    setShowEmailModal(false)
    setError('')
    setIsPlacing(true)
    try {
      if (payMode === 'cod') {
        // Cash on delivery: one call, no payment window.
        const done = await submitOrder()
        if (!done) { setIsPlacing(false); return }
        finishOrder(done.order_id)
      } else {
        await placeOnlineOrder()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setIsPlacing(false)
    }
  }

  if (loadingAddresses) {
    return (
      <div className="min-h-screen max-w-2xl mx-auto px-4 pt-8 pb-16">
        <Skeleton className="h-8 w-40 mb-6" />
        <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AddressCardSkeleton />
            <AddressCardSkeleton />
          </div>
        </section>
      </div>
    )
  }

  return (
    <>
      {/* ── Fixed header ── */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-4 h-16 lg:h-[68px] bg-surface border-b-2 border-table-border shadow-sm">
        <button
          onClick={() => router.back()}
          className="relative z-10 p-2 -ml-1 text-primary/70 hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="relative z-10 absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <Link href="/">
            <Logo className="h-12 lg:h-[52px] w-auto" />
          </Link>
        </div>
        <div className="relative z-10 ml-auto flex items-center gap-1.5 text-[12px] font-black text-on-surface-variant">
          <ShieldCheck size={12} strokeWidth={2.5} /> Secure
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="pt-16 lg:pt-[68px] max-w-[1200px] mx-auto px-4 md:px-6 lg:grid lg:grid-cols-12 lg:gap-8 items-start">

        {/* LEFT — Checkout steps */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5 mt-6">

          {/* Page title */}
          <div>
            <p className="text-[11px] font-black text-on-surface-variant/40 mb-1">
              Step 1 of 1
            </p>
            <h1 className="text-2xl font-black text-primary tracking-tight">
              Checkout
            </h1>
          </div>

          {/* ── Delivery Address ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-sm text-primary flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <MapPin size={14} className="text-white" />
                </div>
                Delivery Address
              </h2>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 text-[11px] font-black text-on-surface-variant border-2 border-table-border rounded-xl px-3 py-1.5 hover:border-primary/40 hover:text-primary transition duration-200"
              >
                <Plus size={12} strokeWidth={2.5} /> Add New
              </button>
            </div>

            {addresses.length === 0 ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-10 border-2 border-dashed border-table-border rounded-2xl flex flex-col items-center gap-3 text-on-surface-variant/40 hover:border-primary/40 hover:text-primary transition duration-200"
              >
                <MapPin size={28} strokeWidth={1.5} />
                <span className="text-[11px] font-black">Add a delivery address</span>
              </button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((addr) => {
                  const isSelected = addr.id === selectedId
                  return (
                    <button
                      key={addr.id}
                      onClick={() => setSelectedId(addr.id)}
                      className={cn(
                        'relative rounded-2xl border-2 p-4 text-left transition duration-200',
                        isSelected
                          ? 'border-primary bg-primary/3 shadow-[0_0_0_4px_var(--color-haze)]'
                          : 'border-table-border hover:border-primary/30',
                      )}
                    >
                      {/* Selected tick */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-[12px]">✓</span>
                        </div>
                      )}

                      {addr.label && (
                        <p className="text-[11px] font-black text-on-surface-variant/40 mb-1">
                          {addr.label}
                        </p>
                      )}
                      <p className="font-black text-sm text-primary mb-1">{addr.name}</p>
                      <p className="text-xs font-medium text-on-surface-variant/70 leading-relaxed">
                        {addr.line1}
                        {addr.line2 && `, ${addr.line2}`}
                        <br />
                        {addr.city}, {addr.state} {addr.pincode}
                      </p>
                      <p className="text-xs font-medium text-on-surface-variant/50 mt-1.5">{addr.phone}</p>

                      {/* Edit + pincode checker */}
                      {isSelected && (
                        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => setEditing(addr)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(addr) } }}
                            className="inline-flex items-center gap-1.5 text-[11px] font-black text-on-surface-variant hover:text-primary transition-colors cursor-pointer mb-3"
                          >
                            <Pencil size={12} strokeWidth={2.5} /> Edit address
                          </span>
                          <PincodeChecker
                            pincode={addr.pincode}
                            onResult={setPincodeResult}
                          />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Delivery Method ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
            <h2 className="font-black text-sm text-primary flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Truck size={14} className="text-white" />
              </div>
              Delivery Method
            </h2>
            <div className="rounded-2xl border-2 border-primary bg-primary/3 p-4 flex items-start gap-4">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-[12px] font-black">✓</span>
              </div>
              <div>
                <p className="font-black text-sm text-primary">
                  Kuthari Beauty Store Direct Delivery
                </p>
                <p className="text-xs font-medium text-on-surface-variant/60 mt-1 leading-relaxed">
                  Our dedicated fleet delivers your order directly to your premises.
                </p>
              </div>
            </div>
          </section>

          {/* ── Payment Method ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
            <h2 className="font-black text-sm text-primary flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Wallet size={14} className="text-white" />
              </div>
              Payment Method
            </h2>
            <PaymentOptions
              modes={paymentModes}
              value={payMode}
              onChange={setChosenMode}
              total={cashTotal}
              advance={advance}
              advancePercent={deliveryConfig.bulkAdvancePercent}
            />
          </section>

          {/* ── GST Invoice (optional) ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
            <h2 className="font-black text-sm text-primary flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Receipt size={14} className="text-white" />
              </div>
              GST Invoice
              <span className="text-[12px] normal-case tracking-normal text-on-surface-variant/50 font-medium">
                (optional)
              </span>
            </h2>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="sr-only"
              />
              <div
                className={cn(
                  'mt-0.5 w-9 h-5 rounded-full transition-colors flex-shrink-0',
                  gstEnabled ? 'bg-primary' : 'bg-outline-variant',
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                    gstEnabled ? 'translate-x-[18px]' : 'translate-x-0.5',
                  )}
                />
              </div>
              <span className="text-sm font-bold text-on-surface-variant leading-snug">
                I&apos;m buying for my business. Add my GST details so I can claim input tax credit.
              </span>
            </label>

            {gstEnabled && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="gst-business" className="text-[11px] font-black text-on-surface-variant/70 block mb-1.5">
                    Registered Business Name *
                  </label>
                  <input
                    id="gst-business"
                    value={gstBusinessName}
                    onChange={(e) => setGstBusinessName(e.target.value)}
                    placeholder="e.g. Glow Beauty Parlour"
                    className="w-full px-4 py-3 rounded-xl border-2 border-table-border bg-background text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="gst-number" className="text-[11px] font-black text-on-surface-variant/70 block mb-1.5">
                    GSTIN *
                  </label>
                  <input
                    id="gst-number"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="21GBUPR9356D1Z3"
                    maxLength={15}
                    autoCapitalize="characters"
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border-2 bg-background text-base font-bold uppercase text-on-surface placeholder:text-on-surface-variant/40 placeholder:font-medium placeholder:tracking-normal focus:outline-none transition-colors',
                      gstin.length === 0 || isValidGstin(gstin)
                        ? 'border-table-border focus:border-primary'
                        : 'border-error focus:border-error',
                    )}
                  />
                  {gstin.length > 0 && !isValidGstin(gstin) && (
                    <p className="text-[11px] font-bold text-error mt-1">Enter a valid 15-character GSTIN.</p>
                  )}
                </div>
                <p className="sm:col-span-2 text-[11px] font-medium text-on-surface-variant/60 leading-relaxed">
                  Your invoice will show these GST details so you can claim input tax credit.
                  <strong className="text-primary"> Note: GST invoice orders can&apos;t be cancelled once placed.</strong>
                </p>
              </div>
            )}
          </section>

          {/* ── Referral code (new customers) ── */}
          {referralEligible && (
            <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
              <h2 className="font-black text-sm text-primary flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Gift size={14} className="text-white" />
                </div>
                Referral Code
                <span className="text-[12px] normal-case tracking-normal text-on-surface-variant/50 font-medium">(optional)</span>
              </h2>
              {referralApplied ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-primary">{referralApplied.code} applied</p>
                    <p className="text-xs font-bold text-on-surface-variant/60 mt-0.5">−₹{referralDiscount.toFixed(0)} off your first order</p>
                  </div>
                  <button
                    onClick={() => { setReferralApplied(null); setReferralInput(''); setReferralError('') }}
                    className="text-[11px] font-black text-on-surface-variant border-2 border-table-border rounded-xl px-3 py-1.5 hover:border-error/40 hover:text-error transition-colors"
                  >Remove</button>
                </div>
              ) : couponDiscount > 0 ? (
                <p className="text-xs font-bold text-on-surface-variant/70 leading-relaxed">
                  A coupon is already applied. You can use a coupon <b>or</b> a referral code, not both. Remove the coupon to enter a friend&apos;s code.
                </p>
              ) : (
                <>
                  <div className="flex items-stretch gap-2">
                    <input
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === 'Enter') applyReferral() }}
                      placeholder="FRIEND'S CODE"
                      className="flex-1 min-w-0 border-2 border-table-border focus:border-primary rounded-xl px-4 py-2.5 text-base bg-background placeholder:text-on-surface-variant/50 focus:outline-none transition-colors font-bold uppercase"
                    />
                    <button
                      onClick={applyReferral}
                      disabled={!referralInput.trim() || referralChecking}
                      className="shrink-0 px-5 bg-primary text-white text-[11px] font-black rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 active:scale-95 flex items-center gap-1.5"
                    >
                      {referralChecking ? <Loader2 size={13} className="animate-spin" /> : null} Apply
                    </button>
                  </div>
                  {referralError && <p className="text-xs font-bold text-error mt-2">{referralError}</p>}
                  <p className="text-[11px] font-medium text-on-surface-variant/50 mt-2">Have a friend&apos;s referral code? Apply it for a discount on your first order.</p>
                </>
              )}
            </section>
          )}

          {/* ── Transport / Bus ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
            <label
              htmlFor="checkout-transport"
              className="block font-black text-sm text-primary mb-3"
            >
              Transport / Bus{' '}
              <span className="text-[12px] normal-case tracking-normal text-on-surface-variant/50 font-medium">
                (optional)
              </span>
            </label>
            <select
              id="checkout-transport"
              value={transportChoice}
              onChange={(e) => setTransportChoice(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-table-border focus:border-primary bg-background text-sm font-bold text-on-surface focus:outline-none transition-colors"
            >
              <option value="">Not specified</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {[v.number, v.name].filter(Boolean).join(', ')}
                </option>
              ))}
              <option value="custom">Other (enter details)</option>
            </select>
            {transportChoice === 'custom' && (
              <input
                type="text"
                value={transportCustom}
                onChange={(e) => setTransportCustom(e.target.value)}
                maxLength={200}
                placeholder="Transporter name, bus number, ticket/LR no…"
                className="mt-3 w-full px-4 py-3 rounded-xl border-2 border-table-border focus:border-primary bg-background text-sm font-medium text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none transition-colors"
              />
            )}
          </section>

          {/* ── Order Notes (mobile) ── */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5 lg:hidden">
            <label
              htmlFor="checkout-notes"
              className="block font-black text-sm text-primary mb-3"
            >
              Order Notes{' '}
              <span className="text-[12px] normal-case tracking-normal text-on-surface-variant/50 font-medium">
                (optional)
              </span>
            </label>
            <textarea
              id="checkout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Special instructions, preferred delivery time…"
              className="w-full px-4 py-3 rounded-xl border-2 border-table-border focus:border-primary bg-background text-sm font-medium text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none transition-colors resize-none"
            />
          </section>
        </div>

        {/* ── RIGHT — Order Summary ── */}
        <div className="lg:col-span-5 xl:col-span-4 mt-5 lg:mt-6 lg:sticky lg:top-24 pb-28 lg:pb-0">
          <section className="relative bg-primary rounded-2xl overflow-hidden p-5">

            <div className="relative z-10">
              <p className="text-[11px] font-black text-white/80 mb-4">
                Order Summary
              </p>

              {/* Item list */}
              <div className="space-y-3 mb-4 pb-4 border-b border-white/15">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full mix-blend-luminosity opacity-70"
                          />
                        ) : (
                          <Package size={16} className="text-white/50" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white line-clamp-1">{item.name}</p>
                        <p className="text-[12px] text-white/80 font-medium">{item.unit} × {item.quantity}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-white flex-shrink-0">
                      ₹{(item.price * item.quantity).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="space-y-2.5 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/80 font-medium">Subtotal ({totalItems()} items)</span>
                  <span className="text-white font-black">₹{subtotal.toFixed(0)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80 font-medium">
                      Coupon {validCouponCode ? `(${validCouponCode})` : 'Discount'}
                    </span>
                    <span className="text-emerald-300 font-black">−₹{couponDiscount.toFixed(0)}</span>
                  </div>
                )}
                {referralDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80 font-medium">Referral ({referralApplied?.code})</span>
                    <span className="text-emerald-300 font-black">−₹{referralDiscount.toFixed(0)}</span>
                  </div>
                )}
                {creditApplied > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80 font-medium">Referral reward</span>
                    <span className="text-emerald-300 font-black">−₹{creditApplied.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pb-3 border-b border-white/15">
                  <span className="text-white/80 font-medium">Delivery</span>
                  {deliveryFee > 0
                    ? <span className="text-white font-black">₹{deliveryFee.toFixed(0)}</span>
                    : <span className="text-white font-black text-xs">Free</span>}
                </div>
              </div>

              <div className="flex items-end justify-between mb-5">
                <span className="text-[12px] font-black text-white/80">Total</span>
                <span className="text-2xl font-black text-white">₹{grandTotal.toFixed(0)}</span>
              </div>

              {/* What is paid now and what on delivery, for the chosen method. */}
              <div className="mb-5">
                <p className="text-[12px] font-bold text-white/60 mb-2">Payment</p>
                <div className="w-full px-4 py-3 rounded-xl border-2 border-white/20 bg-white/5 text-left space-y-1">
                  {payMode === null && <span className="block text-sm font-bold text-white">Ordering is paused right now</span>}
                  {payMode === 'online' && (
                    <span className="block text-sm font-bold text-white">Pay ₹{grandTotal.toFixed(0)} online now</span>
                  )}
                  {payMode === 'cod' && (
                    <span className="block text-sm font-bold text-white">Pay ₹{cashTotal} in cash on delivery</span>
                  )}
                  {payMode === 'partial' && (
                    <>
                      <span className="flex justify-between text-sm font-bold text-white"><span>Online now</span><span>₹{advance}</span></span>
                      <span className="flex justify-between text-sm text-white/80"><span>Cash on delivery</span><span>₹{cashTotal - advance}</span></span>
                    </>
                  )}
                </div>
              </div>

              {/* Notes — desktop */}
              <div className="hidden lg:block mb-5">
                <label
                  htmlFor="checkout-notes-desktop"
                  className="block text-[12px] font-black text-white/35 mb-2"
                >
                  Order Notes (optional)
                </label>
                <textarea
                  id="checkout-notes-desktop"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Special instructions…"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-white/15 bg-white/8 text-sm font-medium text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors resize-none"
                />
              </div>

              {error && (
                <p className="text-xs font-bold text-error bg-white/10 rounded-xl px-3 py-2 mb-3">
                  {error}
                </p>
              )}

              {/* Desktop CTA */}
              <button
                onClick={requestPlaceOrder}
                disabled={!canPlace || isPlacing}
                className="hidden md:flex w-full items-center justify-center gap-2 bg-white text-primary font-black text-sm py-4 px-4 rounded-xl hover:bg-white/90 transition duration-200 active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPlacing && <Loader2 size={16} className="animate-spin" />}
                {isPlacing
                  ? 'Processing…'
                  : `Pay ₹${grandTotal.toFixed(0)}`}
              </button>

              {gstEnabled && !gstOk && (
                <p className="text-[11px] font-medium text-white/40 text-center mt-3">
                  Enter a valid GSTIN and business name to continue
                </p>
              )}
              {!storeOpen ? (
                <p className="text-[11px] font-black text-white text-center mt-3">
                  Orders are accepted only between {openLabel} and {closeLabel}. Please order during store hours.
                </p>
              ) : belowMinOrder ? (
                <p className="text-[11px] font-black text-white text-center mt-3">
                  Minimum order ₹{minOrderValue.toLocaleString('en-IN')}. Add ₹{(minOrderValue - subtotal).toLocaleString('en-IN')} more to place your order
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {/* ── Mobile sticky bottom bar ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 w-full bg-primary border-t-2 border-primary/50 px-4 py-3 shadow-[var(--shadow-modal)] z-40"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[11px] font-black text-white/80">
            Total{couponDiscount > 0 ? ` · −₹${couponDiscount.toFixed(0)}` : ''}
          </span>
          <span className="text-xl font-black text-white">₹{grandTotal.toFixed(0)}</span>
        </div>
        {!storeOpen ? (
          <p className="text-[11px] font-black text-white bg-error/30 border border-error/40 rounded-lg py-1.5 px-2 text-center mb-2">
            Orders open {openLabel} to {closeLabel}. Closed right now.
          </p>
        ) : belowMinOrder ? (
          <p className="text-[11px] font-black text-white bg-error/30 border border-error/40 rounded-lg py-1.5 px-2 text-center mb-2">
            Min order ₹{minOrderValue.toLocaleString('en-IN')}. Add ₹{(minOrderValue - subtotal).toLocaleString('en-IN')} more
          </p>
        ) : null}
        {error && <p className="text-xs font-bold text-error mb-2">{error}</p>}
        <button
          onClick={requestPlaceOrder}
          disabled={!canPlace || isPlacing}
          className="w-full flex items-center justify-center gap-2 bg-white text-primary font-black text-sm py-3.5 px-4 rounded-xl active:scale-95 transition duration-200 disabled:opacity-40"
        >
          {isPlacing && <Loader2 size={16} className="animate-spin" />}
          {isPlacing
            ? 'Processing…'
            : `Pay ₹${grandTotal.toFixed(0)}`}
        </button>
      </div>

      {/* ── Email prompt modal — active email for all order/status updates ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="email-modal-title">
          <div className="w-full max-w-md bg-surface rounded-3xl border-2 border-table-border shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-white" />
              </div>
              <div>
                <h3 id="email-modal-title" className="font-black text-lg text-primary leading-tight">Your email for order updates</h3>
                <p className="text-[11px] font-bold text-on-surface-variant/50">Required</p>
              </div>
            </div>
            <p className="text-sm font-medium text-on-surface-variant/80 mb-4">
              Enter an active email address. We&apos;ll send your order confirmation and every status update: <strong className="text-primary">processing, shipped, out for delivery</strong> and <strong className="text-primary">delivered</strong> — to this email.
            </p>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && emailValid && !isPlacing) placeOrder() }}
              placeholder="you@example.com"
              aria-invalid={email.trim().length > 0 && !emailValid}
              className={cn(
                'w-full px-4 py-3 rounded-xl border-2 bg-background text-sm font-medium text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none transition-colors',
                email.trim().length > 0 && !emailValid ? 'border-error focus:border-error' : 'border-table-border focus:border-primary',
              )}
            />
            {email.trim().length > 0 && !emailValid && (
              <p className="mt-2 text-xs font-bold text-error">Please enter a valid email address.</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowEmailModal(false)}
                disabled={isPlacing}
                className="flex-1 py-3 rounded-xl border-2 border-table-border font-black text-xs text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={placeOrder}
                disabled={!emailValid || isPlacing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-black text-xs hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPlacing && <Loader2 size={16} className="animate-spin" />}
                {isPlacing ? 'Placing…' : 'Confirm & Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Address form modal ── */}
      {showForm && (
        <AddressForm
          profileId={profileId}
          onSaved={(addr) => {
            setAddresses((prev) => [addr, ...prev])
            setSelectedId(addr.id)
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {editing && (
        <AddressForm
          profileId={profileId}
          address={editing}
          onSaved={(addr) => {
            setAddresses((prev) => prev.map((x) => (x.id === addr.id ? addr : x)))
            setSelectedId(addr.id)
            // Re-check serviceability against the edited pincode.
            setPincodeResult(null)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
