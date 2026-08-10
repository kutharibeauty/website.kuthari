'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import DeliveryOtpModal from '@/components/delivery/DeliveryOtpModal'
import PaymentModal from '@/components/delivery/PaymentModal'
import type { OrderItem, Address } from '@/types/database.types'

type DeliveryOrderDetail = {
  id: string
  status: string
  total: number
  subtotal: number
  delivery_fee: number
  items: OrderItem[]
  address: Address | null
  payment_method: string
  assigned_to: string | null
  delivered_at: string | null
  otp_sent: boolean
  otp_verified: boolean
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  assigned:         'Ready for Pickup',
  processing:       'Ready for Pickup',
  confirmed:        'Confirmed',
  packed:           'Ready for Pickup',
  shipping:         'Out for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
}

const STATUS_CHIP: Record<string, string> = {
  assigned:         'bg-amber-100 text-amber-700',
  processing:       'bg-amber-100 text-amber-700',
  confirmed:        'bg-blue-100 text-blue-700',
  packed:           'bg-amber-100 text-amber-700',
  shipping:         'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-700',
}

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

export default function DeliveryOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [order, setOrder] = useState<DeliveryOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // OTP modal state
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [phoneLast4, setPhoneLast4] = useState('XXXX')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Status update
  const [markingOutForDelivery, setMarkingOutForDelivery] = useState(false)

  useEffect(() => {
    fetchOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchOrder() {
    const res = await fetch('/api/delivery/orders')
    const data = await res.json()
    if (data.error === 'Unauthorized') { router.replace('/delivery/login'); return }
    const found = (data.orders ?? []).find((o: DeliveryOrderDetail) => o.id === id)
    if (!found) { router.replace('/delivery/dashboard'); return }
    setOrder(found)
    setOtpSent(found.otp_sent)
    setOtpVerified(found.otp_verified)
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function markOutForDelivery() {
    if (!order) return
    setMarkingOutForDelivery(true)
    const res = await fetch('/api/delivery/orders/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id, status: 'shipping' }),
    })
    if (res.ok) {
      setOrder(prev => prev ? { ...prev, status: 'shipping' } : prev)
      showToast('Marked as out for delivery')
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Failed to update')
    }
    setMarkingOutForDelivery(false)
  }

  async function sendOtp() {
    if (!order) return
    setSendingOtp(true)
    const res = await fetch('/api/delivery/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id }),
    })
    const data = await res.json()
    setSendingOtp(false)
    if (res.ok) {
      setPhoneLast4(data.phone_last4 ?? 'XXXX')
      setOtpSent(true)
      setShowOtpModal(true)
    } else {
      showToast(data.error ?? 'Failed to send OTP')
    }
  }

  async function resendOtp() {
    await sendOtp()
  }

  function onOtpVerified() {
    setShowOtpModal(false)
    setOtpVerified(true)
    showToast('OTP verified! Proceed to payment.')
  }

  function onDelivered() {
    setShowPaymentModal(false)
    setOrder(prev => prev ? { ...prev, status: 'delivered', delivered_at: new Date().toISOString() } : prev)
    showToast('Delivery confirmed!')
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!order) return null

  const addr = order.address
  const mapsUrl = addr
    ? `https://maps.google.com/?q=${encodeURIComponent([addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', '))}`
    : null

  const isAssigned = ['confirmed', 'packed', 'assigned', 'processing'].includes(order.status)
  const isOutForDelivery = ['shipping', 'out_for_delivery'].includes(order.status)
  const isDelivered = order.status === 'delivered'

  return (
    <div className="max-w-lg mx-auto pb-40">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background px-4 pt-5 pb-3 flex items-center gap-3 border-b border-outline-variant/20">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[22px]">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-headline-sm text-headline-sm text-primary">
            Order #{order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {new Date(order.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={cn(
          'px-2.5 py-1 rounded-full font-label-sm text-label-sm shrink-0',
          STATUS_CHIP[order.status] ?? 'bg-surface-container text-on-surface-variant',
        )}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className="p-4 space-y-3">

        {/* Customer */}
        <section className="bg-surface rounded-2xl p-4 space-y-3" style={{ boxShadow: '0 2px 12px rgba(61,43,31,0.06)' }}>
          <h2 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Customer</h2>
          <p className="font-headline-sm text-headline-sm text-on-surface">{addr?.name ?? '—'}</p>
          {addr?.phone && (
            <a
              href={`tel:${addr.phone}`}
              className="flex items-center gap-2 font-body-lg text-body-lg text-secondary"
            >
              <span className="material-symbols-outlined text-[20px]">call</span>
              {addr.phone}
            </a>
          )}
        </section>

        {/* Address */}
        <section className="bg-surface rounded-2xl p-4 space-y-3" style={{ boxShadow: '0 2px 12px rgba(61,43,31,0.06)' }}>
          <h2 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Delivery Address</h2>
          {addr ? (
            <>
              <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                {addr.line1}
                {addr.line2 ? `, ${addr.line2}` : ''}
                {'\n'}{addr.city}, {addr.state} — {addr.pincode}
              </p>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-body-md text-body-md text-secondary"
                >
                  <span className="material-symbols-outlined text-[18px]">map</span>
                  Open in Google Maps
                </a>
              )}
            </>
          ) : (
            <p className="font-body-md text-body-md text-on-surface-variant">No address</p>
          )}
        </section>

        {/* Items */}
        <section className="bg-surface rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(61,43,31,0.06)' }}>
          <h2 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-3">
            Items ({order.items.length})
          </h2>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-outline-variant/20" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">inventory_2</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-body-md text-on-surface font-medium truncate">{item.name}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{item.unit} × {item.quantity}</p>
                </div>
                <p className="font-body-md text-body-md text-on-surface font-semibold shrink-0">
                  {fmt(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
            <span className="font-headline-sm text-headline-sm text-primary">Order Total (Prepaid)</span>
            <span className="font-headline-sm text-headline-sm text-primary">{fmt(order.total)}</span>
          </div>
        </section>

        {/* OTP + delivery status tracker (for out_for_delivery) */}
        {isOutForDelivery && (
          <section className="bg-surface rounded-2xl p-4 space-y-3" style={{ boxShadow: '0 2px 12px rgba(61,43,31,0.06)' }}>
            <h2 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Delivery Steps</h2>

            {/* Step 1: OTP sent */}
            <div className={cn('flex items-center gap-3 p-3 rounded-xl', otpSent ? 'bg-green-50' : 'bg-surface-container')}>
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', otpSent ? 'bg-green-500' : 'bg-outline-variant')}>
                <span className="material-symbols-outlined text-white text-[14px]">{otpSent ? 'check' : '1'}</span>
              </div>
              <span className={cn('font-body-md text-body-md', otpSent ? 'text-green-700' : 'text-on-surface-variant')}>
                OTP sent to customer
              </span>
            </div>

            {/* Step 2: OTP verified */}
            <div className={cn('flex items-center gap-3 p-3 rounded-xl', otpVerified ? 'bg-green-50' : 'bg-surface-container')}>
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', otpVerified ? 'bg-green-500' : 'bg-outline-variant')}>
                <span className="material-symbols-outlined text-white text-[14px]">{otpVerified ? 'check' : '2'}</span>
              </div>
              <span className={cn('font-body-md text-body-md', otpVerified ? 'text-green-700' : 'text-on-surface-variant')}>
                Customer OTP verified
              </span>
            </div>

            {/* Step 3: Payment & delivery */}
            <div className={cn('flex items-center gap-3 p-3 rounded-xl', isDelivered ? 'bg-green-50' : 'bg-surface-container')}>
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', isDelivered ? 'bg-green-500' : 'bg-outline-variant')}>
                <span className="material-symbols-outlined text-white text-[14px]">{isDelivered ? 'check' : '3'}</span>
              </div>
              <span className={cn('font-body-md text-body-md', isDelivered ? 'text-green-700' : 'text-on-surface-variant')}>
                Payment collected & delivered
              </span>
            </div>
          </section>
        )}

        {/* Delivered summary */}
        {isDelivered && (
          <section className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <span className="material-symbols-outlined text-green-600 text-[40px]">check_circle</span>
            <p className="font-headline-sm text-headline-sm text-green-700 mt-1">Delivered!</p>
            {order.delivered_at && (
              <p className="font-body-md text-body-md text-green-600 mt-0.5">
                {new Date(order.delivered_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </section>
        )}
      </div>

      {/* ── Bottom Action Sheet ── */}
      {!isDelivered && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-outline-variant/20 p-4 space-y-2 max-w-lg mx-auto">

          {/* Assigned → Out for Delivery */}
          {isAssigned && (
            <button
              onClick={markOutForDelivery}
              disabled={markingOutForDelivery}
              className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-on-primary rounded-2xl font-body-lg text-body-lg font-semibold disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {markingOutForDelivery ? (
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
              )}
              {markingOutForDelivery ? 'Updating…' : 'Mark as Out for Delivery'}
            </button>
          )}

          {/* Out for delivery: send OTP */}
          {isOutForDelivery && !otpVerified && (
            <button
              onClick={sendOtp}
              disabled={sendingOtp}
              className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-on-primary rounded-2xl font-body-lg text-body-lg font-semibold disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {sendingOtp ? (
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">notifications</span>
              )}
              {sendingOtp ? 'Sending OTP…' : "I'm at the Customer's Door"}
            </button>
          )}

          {/* OTP verified: show payment button */}
          {isOutForDelivery && otpVerified && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-2xl font-body-lg text-body-lg font-semibold active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">payments</span>
              Collect Payment & Confirm Delivery
            </button>
          )}

          {/* Re-show OTP modal if otp sent but not yet verified */}
          {isOutForDelivery && otpSent && !otpVerified && (
            <button
              onClick={() => setShowOtpModal(true)}
              className="w-full text-center font-body-md text-body-md text-secondary py-2"
            >
              Enter customer OTP
            </button>
          )}
        </div>
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <DeliveryOtpModal
          orderId={order.id}
          phoneLast4={phoneLast4}
          onVerified={onOtpVerified}
          onClose={() => setShowOtpModal(false)}
          onResend={resendOtp}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          orderId={order.id}
          total={order.total}
          onDelivered={onDelivered}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-on-surface text-surface rounded-full font-body-md text-body-md shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
