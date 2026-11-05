'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  ShoppingBag,
  Package,
  MapPin,
  CreditCard,
  Receipt,
  Download,
  Printer,
  RefreshCw,
  Truck,
  CalendarCheck,
  Loader2,
  AlertTriangle,
  XCircle,
  Copy,
} from 'lucide-react'
import OrderTimeline from '@/components/orders/OrderTimeline'
import OrderIssuePanel from '@/components/orders/OrderIssuePanel'
import type { OrderIssue } from '@/lib/orders/issues'
import ReviewPopup from '@/components/product/ReviewPopup'
import { useCartStore } from '@/store/cartStore'
import type { Order, OrderItem } from '@/types/database.types'

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function estimatedDelivery(order: Order) {
  if (order.estimated_delivery) return fmtDate(order.estimated_delivery)
  // Fallback: created_at + 2 days
  const d = new Date(order.created_at)
  d.setDate(d.getDate() + 2)
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusLabel(s: Order['status']) {
  return {
    placed: 'Order Placed',
    confirmed: 'Confirmed',
    packed: 'Packed',
    shipping: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    returned: 'Returned',
  }[s] ?? s
}

// ── Order item row ────────────────────────────────────────────────────────────
function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="bg-surface-card rounded-2xl border-2 border-table-border p-4 flex gap-4 items-center hover:border-primary/30 transition-colors duration-200">
      <div className="w-20 h-20 bg-surface-container-low rounded-xl overflow-hidden flex-shrink-0 relative border-2 border-table-border">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover mix-blend-multiply" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package size={24} className="text-on-surface-variant/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="font-black text-primary text-sm leading-snug truncate">{item.name}</h4>
          <p className="font-black text-primary text-base whitespace-nowrap flex-shrink-0">{fmt(item.price)}</p>
        </div>
        <span className="inline-block border border-table-border rounded-full px-2 py-0.5 text-[12px] font-black text-on-surface-variant/50 mb-2">
          {item.unit}
        </span>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-on-surface-variant/60">Qty: <span className="font-black text-primary">{item.quantity}</span></span>
          <span className="text-sm font-black text-primary">Total: {fmt(item.price * item.quantity)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Success Overlay ───────────────────────────────────────────────────────────
// Party-popper confetti burst — lightweight, no dependency. Pieces are computed
// once at module load (not during render, to stay pure) and flutter down as the
// overlay appears.
const CONFETTI_COLORS = ['#1b2c3d', '#b9862f', '#d9af5c', '#7c3aed', '#16a34a', '#dc2626', '#2563eb']
const CONFETTI_PIECES = Array.from({ length: 42 }, (_, i) => ({
  left: Math.random() * 100,
  delay: Math.random() * 0.25,
  duration: 1.6 + Math.random() * 1.4,
  size: 6 + Math.random() * 8,
  rotate: Math.random() * 720 - 360,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}))

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20" aria-hidden="true">
      {CONFETTI_PIECES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 rounded-[2px]"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.6, backgroundColor: p.color }}
          initial={{ y: -20, opacity: 0, rotate: 0 }}
          animate={{ y: ['-5%', '110%'], opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

function SuccessOverlay({
  order,
  onDismiss,
  referralCode = null,
  referralBenefit = null,
}: {
  order: Order
  onDismiss: () => void
  referralCode?: string | null
  referralBenefit?: string | null
}) {
  const orderId = order.order_number || `KBS-${order.id.slice(0, 8).toUpperCase()}`
  const [copiedCode, setCopiedCode] = useState(false)
  const copyCode = async () => {
    if (!referralCode) return
    try { await navigator.clipboard.writeText(referralCode); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 1800) } catch {}
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Confetti />
      <motion.div
        className="w-full max-w-lg bg-surface-card rounded-2xl shadow-2xl overflow-hidden border border-table-border flex flex-col items-center text-center relative"
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary z-30" />

        {/* Scrolls within itself on short screens: the receipt, invoice button
            and referral block together are taller than a small phone viewport,
            and the page behind is locked. */}
        <div className="w-full p-6 sm:p-8 flex flex-col items-center max-h-[88dvh] overflow-y-auto overscroll-contain">
          {/* Animated checkmark */}
          <motion.div
            className="relative w-24 h-24 mb-5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', damping: 12, stiffness: 200 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            />
            <div className="absolute inset-2 rounded-full bg-primary-container opacity-40" />
            <div className="absolute inset-0 bg-primary-container rounded-full flex items-center justify-center shadow-md z-10">
              <Check size={48} className="text-on-primary" strokeWidth={2.5} />
            </div>
          </motion.div>

          <motion.h1
            className="text-2xl md:text-3xl font-bold text-on-surface mb-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            Order Successful!
          </motion.h1>
          <motion.p
            className="text-sm text-on-surface-variant mb-6 max-w-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Thank you! Your order has been placed and is being processed.
          </motion.p>

          {/* Receipt mini-card */}
          <motion.div
            className="w-full bg-surface-container-low border border-table-border rounded-xl p-4 flex flex-col gap-3 text-left mb-6 shadow-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-outline">
                Order ID
              </span>
              <span className="text-base font-bold text-primary">#{orderId}</span>
            </div>
            <hr className="border-table-border" />
            <div>
              <span className="text-xs font-bold text-outline block mb-2">
                Estimated Delivery
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
                  <Truck size={18} className="text-on-secondary-container" />
                </div>
                <div>
                  <p className="font-bold text-on-surface">{estimatedDelivery(order)}</p>
                  <p className="text-xs text-on-surface-variant">Standard delivery</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Invoice — same endpoint the order page below uses. `download` so it
              saves the PDF rather than navigating away from this celebration. */}
          <motion.a
            href={`/api/orders/${order.id}/invoice?download=1`}
            download
            className="w-full h-12 mb-6 rounded-xl border-2 border-primary/25 bg-primary/[0.04] text-primary text-sm font-black flex items-center justify-center gap-2 hover:bg-primary/10 hover:border-primary/40 active:scale-95 transition"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Download size={16} /> Download Invoice
          </motion.a>

          {/* Referral code reveal */}
          {referralCode && (
            <motion.div
              className="w-full rounded-xl border-2 border-primary bg-primary/5 p-4 mb-6 text-left"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, type: 'spring', damping: 14 }}
            >
              <p className="text-sm font-black text-primary flex items-center gap-1.5">
                Here&apos;s your referral code
              </p>
              {referralBenefit && (
                <p className="text-xs font-medium text-on-surface-variant/70 mt-0.5">{referralBenefit}. Share it with friends.</p>
              )}
              <div className="flex items-stretch gap-2 mt-3">
                <div className="flex-1 min-w-0 rounded-lg bg-surface border-2 border-primary/20 px-3 py-2.5 flex items-center">
                  <span className="font-black text-lg tracking-[0.18em] text-primary truncate">{referralCode}</span>
                </div>
                <button onClick={copyCode} className="shrink-0 w-11 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95" aria-label="Copy referral code">
                  {copiedCode ? <Check size={17} /> : <Copy size={17} />}
                </button>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            className="w-full flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              href="/"
              className="flex-1 h-12 border border-table-border text-primary text-sm font-semibold rounded-xl hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} /> Continue Shopping
            </Link>
            <button
              onClick={onDismiss}
              className="flex-1 h-12 bg-primary text-on-primary text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md"
            >
              <MapPin size={18} /> View Order Details
            </button>
          </motion.div>

          <motion.p
            className="text-xs text-outline mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            A confirmation has been sent to your registered account.
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────
export default function OrderDetailClient({
  order,
  isNew,
  referralCode = null,
  referralBenefit = null,
  issue = null,
}: {
  order: Order
  isNew: boolean
  issue?: OrderIssue | null
  referralCode?: string | null
  referralBenefit?: string | null
}) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const [showSuccess, setShowSuccess] = useState(isNew)
  const [reordering, setReordering] = useState(false)
  const [skippedItems, setSkippedItems] = useState<string[]>([])
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  // A customer may cancel only before the admin confirms (status still 'placed'),
  // and never for a GST-invoice order. The server enforces this too.
  const canCancel = order.status === 'placed' && !order.gstin

  // Review popup queue
  const [reviewIdx, setReviewIdx] = useState(0)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    // Wait for the success celebration to be dismissed first — otherwise this
    // fires 3s in and covers it. (Never noticed before, because the redirect
    // race in checkout meant the celebration never appeared at all.)
    if (!isNew || showSuccess) return
    const t = setTimeout(() => setShowReview(true), 3000)
    return () => clearTimeout(t)
  }, [isNew, showSuccess])

  function handleDismissSuccess() {
    setShowSuccess(false)
    // Remove ?new=1 from URL without navigation
    router.replace(`/orders/${order.id}`, { scroll: false })
  }

  const handleReorder = useCallback(async () => {
    setReordering(true)
    setSkippedItems([])
    try {
      const productIds = order.items.map((i) => i.product_id)
      const res = await fetch('/api/orders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: productIds }),
      })
      const { products } = await res.json() as {
        products: Array<{ id: string; name: string; slug: string; price: number; mrp: number | null; unit: string; images: string[]; stock_qty: number; is_active: boolean }>
      }

      const productMap = Object.fromEntries(products.map((p) => [p.id, p]))
      const skipped: string[] = []

      for (const item of order.items) {
        const current = productMap[item.product_id]
        if (!current || !current.is_active || current.stock_qty <= 0) {
          skipped.push(item.name)
          continue
        }
        addItem({
          id: current.id,
          name: current.name,
          slug: current.slug,
          price: current.price,
          mrp: current.mrp,
          unit: current.unit,
          image: current.images?.[0] ?? null,
        })
      }

      setSkippedItems(skipped)
      if (order.items.length - skipped.length > 0) {
        router.push('/cart')
      }
    } catch {
      // ignore
    } finally {
      setReordering(false)
    }
  }, [order.items, addItem, router])

  const handleCancel = useCallback(async () => {
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not cancel the order.')
      setShowCancelConfirm(false)
      router.refresh()
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Could not cancel the order.')
    } finally {
      setCancelling(false)
    }
  }, [order.id, router])

  function handleNextReview() {
    if (reviewIdx + 1 < order.items.length) {
      setReviewIdx((i) => i + 1)
    } else {
      setShowReview(false)
    }
  }

  const currentReviewItem = order.items[reviewIdx]
  const orderId = order.order_number || `KBS-${order.id.slice(0, 8).toUpperCase()}`
  const discount = order.discount ?? 0
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      <AnimatePresence>
        {showSuccess && <SuccessOverlay order={order} onDismiss={handleDismissSuccess} referralCode={referralCode} referralBenefit={referralBenefit} />}
      </AnimatePresence>

      {showReview && currentReviewItem && (
        <ReviewPopup productId={currentReviewItem.product_id} productName={currentReviewItem.name} onClose={handleNextReview} />
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-surface rounded-3xl border-2 border-table-border shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-error" />
              </div>
              <h3 className="font-black text-lg text-primary leading-tight">Cancel this order?</h3>
            </div>
            <p className="text-sm font-medium text-on-surface-variant/80 mb-4">
              Order <strong className="text-primary">#{orderId}</strong> will be cancelled and can&apos;t be undone.
              You can only cancel while an order is still awaiting confirmation.
            </p>
            {cancelError && (
              <p className="text-[13px] font-bold text-error bg-error/10 border-2 border-error/20 rounded-xl px-4 py-3 mb-4">
                {cancelError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl border-2 border-table-border font-black text-xs text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-error text-white font-black text-xs hover:bg-error/90 transition-colors active:scale-95 disabled:opacity-50"
              >
                {cancelling && <Loader2 size={15} className="animate-spin" />}
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen">
        {/* ── Hero strip ── */}
        <div className="relative overflow-hidden bg-primary border-b-2 border-primary mb-6">
          <div className="relative z-10 px-4 max-w-4xl mx-auto py-7 md:py-9 flex items-end justify-between gap-4">
            <div>
              <button onClick={() => router.push('/orders')} className="flex items-center gap-1.5 text-[12px] font-black text-white/40 hover:text-white/70 transition-colors mb-2">
                <ArrowLeft size={12} strokeWidth={2.5} /> Orders
              </button>
              <h1 className="text-2xl font-black text-white tracking-tight">Order Details</h1>
              <p className="text-xs text-white/45 font-black mt-0.5">#{orderId}</p>
            </div>
            <span className={`flex items-center gap-1.5 text-[13px] font-bold px-3 py-1.5 rounded-full border-2 flex-shrink-0 ${
              order.status === 'delivered' ? 'border-success/50 text-success bg-success/10'
              : order.status === 'cancelled' || order.status === 'returned' ? 'border-error/50 text-error bg-error/10'
              : 'border-white/30 text-white bg-white/10'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {statusLabel(order.status)}
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-10">

          {/* Damaged / wrong item: report it, or follow the request */}
          <OrderIssuePanel order={order} initialIssue={issue} />

          {/* Refund of an online payment after cancellation */}
          {order.refund_status && (
            <section role="status" className={`rounded-2xl border-2 p-4 mb-4 ${order.refund_status === 'failed' ? 'border-error/40 bg-error/5' : 'border-success/40 bg-success/5'}`}>
              <p className="font-black text-primary text-[15px]">
                {order.refund_status === 'processed' ? 'Refund sent'
                  : order.refund_status === 'failed' ? 'Refund needs attention'
                  : 'Refund on the way'}
                {order.refund_amount ? ` · ₹${Number(order.refund_amount).toLocaleString('en-IN')}` : ''}
              </p>
              <p className="text-[13px] text-on-surface-variant mt-1">
                {order.refund_status === 'processed'
                  ? 'The money is back with your bank or UPI app. Banks can take up to 5 working days to show it.'
                  : order.refund_status === 'failed'
                    ? 'We could not refund automatically. The shop has been told and will sort it out.'
                    : 'Your payment is being refunded to the same account you paid from, usually within 5 to 7 working days.'}
              </p>
            </section>
          )}

          {/* Status tracker */}
          <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5 mb-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-5">
              <div>
                <p className="text-[11px] font-black text-on-surface-variant/40 mb-1">Order Date</p>
                <p className="font-black text-primary text-sm">{fmtDateTime(order.created_at)}</p>
              </div>
              <div className="md:text-right">
                <p className="text-[11px] font-black text-on-surface-variant/40 mb-1">Estimated Delivery</p>
                <p className="font-black text-primary text-sm flex items-center gap-1 md:justify-end">
                  <CalendarCheck size={13} strokeWidth={2.5} /> {estimatedDelivery(order)}
                </p>
              </div>
            </div>
            <OrderTimeline status={order.status} />
          </section>

          {/* Admin note */}
          {order.custom_message && (
            <div className="border-2 border-primary/30 bg-primary/4 rounded-2xl p-4 mb-4 flex items-start gap-3">
              <span className="text-[11px] font-black text-primary/60 mt-0.5 flex-shrink-0">Note</span>
              <p className="text-sm font-medium text-on-surface/80">{order.custom_message}</p>
            </div>
          )}

          {/* Items */}
          <section className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-table-border" />
              <span className="text-[12px] font-black text-on-surface-variant/40">
                {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'} Ordered
              </span>
              <div className="h-px flex-1 bg-table-border" />
            </div>
            <div className="flex flex-col gap-3">
              {order.items.map((item, idx) => (
                <OrderItemRow key={`${item.product_id}-${idx}`} item={item} />
              ))}
            </div>
          </section>

          {/* Info bento grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Delivery address */}
            <div className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <MapPin size={14} className="text-white" />
                </div>
                <h4 className="font-black text-sm text-primary">Delivery Address</h4>
              </div>
              <div className="text-sm space-y-1">
                <p className="font-black text-primary">{order.address.name}</p>
                <p className="text-on-surface-variant/70 font-medium">{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}</p>
                <p className="text-on-surface-variant/70 font-medium">{order.address.city}, {order.address.state} {order.address.pincode}</p>
                <p className="text-on-surface-variant/60 font-medium pt-1">{order.address.phone}</p>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <CreditCard size={14} className="text-white" />
                </div>
                <h4 className="font-black text-sm text-primary">Payment</h4>
              </div>
              <div className="flex flex-col justify-center items-center py-4 bg-primary/4 rounded-xl border-2 border-primary/20">
                <p className="text-2xl font-black text-primary mb-1">ONLINE</p>
                <p className="text-[11px] font-medium text-on-surface-variant/60 text-center">Paid Online</p>
              </div>
            </div>

            {/* Order summary */}
            <div className="relative bg-primary rounded-2xl overflow-hidden p-5 md:col-span-2 lg:col-span-1">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                    <Receipt size={14} className="text-white" />
                  </div>
                  <h4 className="font-black text-sm text-white">Summary</h4>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-white/50 font-medium">Subtotal ({totalItems})</span><span className="text-white font-black">{fmt(order.subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between"><span className="text-white/50 font-medium">Discount</span><span className="text-white font-black">-{fmt(discount)}</span></div>}
                  <div className="flex justify-between pb-2 border-b border-white/15"><span className="text-white/50 font-medium">Delivery</span><span className="text-white font-black">{order.delivery_fee === 0 ? 'FREE' : fmt(order.delivery_fee)}</span></div>
                  <div className="flex justify-between items-end pt-1"><span className="text-[12px] font-black text-white/40">Grand Total</span><span className="font-black text-2xl text-white">{fmt(order.total)}</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* Skipped items */}
          {skippedItems.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border-2 border-error/30 bg-error/5 mb-4">
              <AlertTriangle size={16} className="text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-error mb-1">{skippedItems.length} item{skippedItems.length > 1 ? 's' : ''} out of stock</p>
                <p className="text-xs font-medium text-on-surface-variant/70">{skippedItems.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-5 border-t-2 border-table-border">
            {canCancel && (
              <button
                onClick={() => { setCancelError(null); setShowCancelConfirm(true) }}
                className="px-5 py-3 rounded-xl text-sm font-black text-error border-2 border-error/30 hover:border-error hover:bg-error/5 active:scale-95 transition flex items-center justify-center gap-2 print:hidden sm:mr-auto"
              >
                <XCircle size={15} /> Cancel Order
              </button>
            )}
            <button onClick={() => window.print()} className="px-5 py-3 rounded-xl text-sm font-black text-on-surface border-2 border-table-border hover:border-primary/40 hover:text-primary active:scale-95 transition flex items-center justify-center gap-2 print:hidden">
              <Printer size={15} /> Print
            </button>
            <a href={`/api/orders/${order.id}/invoice?download=1`} download className="px-5 py-3 rounded-xl text-sm font-black text-on-surface border-2 border-table-border hover:border-primary/40 hover:text-primary active:scale-95 transition flex items-center justify-center gap-2 print:hidden">
              <Download size={15} /> Download PDF
            </a>
            <button onClick={handleReorder} disabled={reordering} className="px-6 py-3 rounded-xl text-sm font-black text-white bg-primary border-2 border-primary hover:bg-primary/90 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-60">
              {reordering ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Reorder
            </button>
          </div>
        </div>
      </div>
    </>
  )
}


