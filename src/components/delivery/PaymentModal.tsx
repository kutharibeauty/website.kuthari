'use client'

import { useState } from 'react'
import RazorpayQR from './RazorpayQR'

interface Props {
  orderId: string
  total: number
  onDelivered: () => void
  onClose: () => void
}

type PaymentType = 'cash' | 'online' | null

export default function PaymentModal({ orderId, total, onDelivered, onClose }: Props) {
  const [paymentType, setPaymentType] = useState<PaymentType>(null)
  const [amountReceived, setAmountReceived] = useState(String(total))
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onlineConfirmed, setOnlineConfirmed] = useState(false)

  async function confirmDelivery() {
    if (!paymentType) return
    if (paymentType === 'online' && !onlineConfirmed) {
      setError('Please confirm online payment received')
      return
    }

    setConfirming(true)
    setError(null)
    const res = await fetch('/api/delivery/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        action: 'confirm_delivery',
        payment_type: paymentType,
        amount_received: paymentType === 'cash' ? Number(amountReceived) : total,
      }),
    })
    const data = await res.json()
    setConfirming(false)

    if (res.ok) {
      onDelivered()
    } else {
      setError(data.error ?? 'Failed to confirm delivery')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="w-full max-w-sm bg-surface rounded-t-3xl sm:rounded-3xl p-6 space-y-5 max-h-[90dvh] overflow-y-auto">

        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-primary">Collect Payment</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
          </button>
        </div>

        <div className="bg-surface-container rounded-2xl p-4 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Amount to Collect</p>
          <p className="font-display-sm text-display-sm text-primary">₹{total.toLocaleString('en-IN')}</p>
        </div>

        {/* Payment method selection */}
        <div className="space-y-2">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Payment Method</p>

          <button
            onClick={() => { setPaymentType('cash'); setError(null) }}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-colors ${
              paymentType === 'cash'
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant bg-surface-container hover:border-primary/40'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              paymentType === 'cash' ? 'border-primary' : 'border-outline-variant'
            }`}>
              {paymentType === 'cash' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">payments</span>
            <span className="font-body-lg text-body-lg text-on-surface">Cash Received</span>
          </button>

          <button
            onClick={() => { setPaymentType('online'); setError(null) }}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-colors ${
              paymentType === 'online'
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant bg-surface-container hover:border-primary/40'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              paymentType === 'online' ? 'border-primary' : 'border-outline-variant'
            }`}>
              {paymentType === 'online' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">qr_code</span>
            <span className="font-body-lg text-body-lg text-on-surface">Online Payment (UPI)</span>
          </button>
        </div>

        {/* Cash: editable amount */}
        {paymentType === 'cash' && (
          <div className="space-y-2">
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Amount Received
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-lg text-body-lg text-on-surface-variant">₹</span>
              <input
                type="number"
                value={amountReceived}
                onChange={e => setAmountReceived(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-surface-container border border-outline-variant rounded-xl font-headline-sm text-headline-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        )}

        {/* Online: QR code */}
        {paymentType === 'online' && (
          <RazorpayQR
            orderId={orderId}
            amount={total}
            onPaymentConfirmed={() => setOnlineConfirmed(true)}
          />
        )}

        {error && (
          <p className="text-center font-body-md text-body-md text-red-600">{error}</p>
        )}

        {/* Confirm delivery button */}
        {paymentType && (paymentType === 'cash' || onlineConfirmed) && (
          <button
            onClick={confirmDelivery}
            disabled={confirming}
            className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-2xl font-body-lg text-body-lg font-semibold disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {confirming ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                Confirming…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Confirm Delivery & Payment
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
