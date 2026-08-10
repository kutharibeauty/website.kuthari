'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  orderId: string
  phoneLast4: string
  onVerified: () => void
  onClose: () => void
  onResend: () => Promise<void>
}

export default function DeliveryOtpModal({ orderId, phoneLast4, onVerified, onClose, onResend }: Props) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    next[index] = value.slice(-1)
    setDigits(next)
    setError(null)
    if (value && index < 5) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      refs.current[5]?.focus()
    }
  }

  async function verify() {
    const otp = digits.join('')
    if (otp.length !== 6) { setError('Enter all 6 digits'); return }

    setLoading(true)
    setError(null)
    const res = await fetch('/api/delivery/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, otp }),
    })
    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      onVerified()
    } else {
      setError(data.error ?? 'Verification failed')
      setDigits(['', '', '', '', '', ''])
      refs.current[0]?.focus()
    }
  }

  async function handleResend() {
    setResending(true)
    setError(null)
    setDigits(['', '', '', '', '', ''])
    await onResend()
    setResending(false)
    refs.current[0]?.focus()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="w-full max-w-sm bg-surface rounded-t-3xl sm:rounded-3xl p-6 space-y-6">

        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-primary">Delivery OTP</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
          </button>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant">
          Ask the customer for the OTP sent to their number ending in{' '}
          <span className="font-semibold text-on-surface">**{phoneLast4}</span>
        </p>

        {/* OTP input boxes */}
        <div className="flex justify-center gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { refs.current[i] = el }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-11 h-14 text-center font-headline-md text-headline-md text-on-surface bg-surface-container border-2 border-outline-variant rounded-xl focus:border-primary focus:outline-none transition-colors"
            />
          ))}
        </div>

        {error && (
          <p className="text-center font-body-md text-body-md text-red-600">{error}</p>
        )}

        <button
          onClick={verify}
          disabled={loading || digits.join('').length !== 6}
          className="w-full py-4 bg-primary text-on-primary rounded-2xl font-body-lg text-body-lg font-semibold disabled:opacity-50 transition-opacity active:scale-[0.98]"
        >
          {loading ? 'Verifying…' : 'Verify OTP'}
        </button>

        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full text-center font-body-md text-body-md text-secondary disabled:opacity-50"
        >
          {resending ? 'Resending…' : 'Resend OTP'}
        </button>
      </div>
    </div>
  )
}
