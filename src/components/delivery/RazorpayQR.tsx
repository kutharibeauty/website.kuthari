'use client'

import { useEffect, useState } from 'react'

interface Props {
  orderId: string
  amount: number
  onPaymentConfirmed: () => void
}

/**
 * Doorstep online payment. Creates a Razorpay payment link for the amount due
 * (also texted to the customer), shows it as a QR, and checks every few seconds
 * whether it has been paid, so the delivery person doesn't have to take the
 * customer's word for it.
 */
export default function RazorpayQR({ orderId, amount, onPaymentConfirmed }: Props) {
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function generateLink() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/delivery/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, action: 'create_payment_link' }),
      })
      const data = await res.json()
      if (res.ok) {
        setPaymentUrl(data.payment_url)
        setQr(data.qr ?? null)
      } else {
        setError(data.error ?? 'Failed to generate payment link')
      }
    } catch {
      setError('No connection. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Poll for the payment once the QR is showing.
  useEffect(() => {
    if (!paymentUrl || paid) return
    const t = setInterval(async () => {
      try {
        const res = await fetch('/api/delivery/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, action: 'check_payment' }),
        })
        const data = await res.json()
        if (res.ok && data.paid) setPaid(true)
      } catch { /* try again next tick */ }
    }, 4000)
    return () => clearInterval(t)
  }, [paymentUrl, paid, orderId])

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
              {paid ? 'Payment received' : 'Scan to pay · link also sent by SMS'}
            </p>
            {paid ? (
              <div className="mx-auto flex h-[200px] w-[200px] items-center justify-center rounded-xl bg-green-50">
                <span className="material-symbols-outlined text-[96px] text-green-600">check_circle</span>
              </div>
            ) : qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Payment QR code" width={200} height={200} className="mx-auto rounded-xl" />
            ) : null}
            <p className="font-headline-md text-headline-md text-primary">
              ₹{amount.toLocaleString('en-IN')}
            </p>
            {!paid && (
              <p className="flex items-center justify-center gap-2 text-[13px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                Waiting for payment…
              </p>
            )}
          </div>

          {!paid && (
            <button
              onClick={copyLink}
              className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container-high text-on-surface rounded-xl font-body-md text-body-md"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied!' : 'Copy Link to Share'}
            </button>
          )}

          <button
            onClick={onPaymentConfirmed}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-body-md text-body-md font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {paid ? 'Complete delivery' : 'Payment Received'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-center font-body-md text-body-md text-red-600">{error}</p>
      )}
    </div>
  )
}
