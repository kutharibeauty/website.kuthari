'use client'

import { useState } from 'react'

interface Props {
  orderId: string
  amount: number
  onPaymentConfirmed: () => void
}

export default function RazorpayQR({ orderId, amount, onPaymentConfirmed }: Props) {
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function generateLink() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/delivery/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, action: 'create_payment_link' }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setPaymentUrl(data.payment_url)
    } else {
      setError(data.error ?? 'Failed to generate payment link')
    }
  }

  async function copyLink() {
    if (!paymentUrl) return
    await navigator.clipboard.writeText(paymentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {!paymentUrl ? (
        <button
          onClick={generateLink}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-secondary text-on-secondary rounded-2xl font-body-lg text-body-lg font-semibold disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
              Generating…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">qr_code</span>
              Generate Payment QR
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-surface-container rounded-2xl p-4 text-center space-y-3">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Razorpay Payment Link
            </p>
            {/* QR visual via Razorpay's own short URL */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(paymentUrl)}&choe=UTF-8`}
              alt="Payment QR code"
              width={200}
              height={200}
              className="mx-auto rounded-xl"
            />
            <p className="font-headline-md text-headline-md text-primary">
              ₹{amount.toLocaleString('en-IN')}
            </p>
          </div>

          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container-high text-on-surface rounded-xl font-body-md text-body-md"
          >
            <span className="material-symbols-outlined text-[18px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied!' : 'Copy Link to Share'}
          </button>

          <button
            onClick={onPaymentConfirmed}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-body-md text-body-md font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Payment Received
          </button>
        </div>
      )}

      {error && (
        <p className="text-center font-body-md text-body-md text-red-600">{error}</p>
      )}
    </div>
  )
}
