'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { DEFAULT_PINCODE_DELIVERY_FEE, computeDeliveryFee } from '@/lib/cart/delivery'
import { useDeliveryConfig } from '@/hooks/useDeliveryConfig'

interface PincodeResult {
  serviceable: boolean
  city?: string
  state?: string
  delivery_days?: number
  /** Admin-set rate for this pincode. null = none on file, use the default. */
  delivery_charge?: number | null
}

interface Props {
  pincode: string
  onResult?: (result: PincodeResult | null) => void
  /** The cart subtotal, at checkout. With it the line shows what this order
   *  will actually pay (free above the threshold); without it, the pincode's
   *  rate and the free-delivery threshold. */
  subtotal?: number
}

/**
 * Shows the delivery charge for the address's pincode.
 *
 * Delivery is all-India, so this never blocks checkout — it exists purely to
 * tell the customer what shipping to that pincode costs before they pay.
 */
export default function PincodeChecker({ pincode, onResult, subtotal }: Props) {
  const config = useDeliveryConfig()
  const [status, setStatus] = useState<'idle' | 'checking' | 'done'>('idle')
  const [result, setResult] = useState<PincodeResult | null>(null)
  const lastPincode = useRef('')

  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) {
      setStatus('idle')
      setResult(null)
      onResult?.(null)
      return
    }
    if (pincode === lastPincode.current) return
    lastPincode.current = pincode

    setStatus('checking')
    fetch(`/api/pincodes/check?pincode=${pincode}`)
      .then((r) => r.json())
      .then((data: PincodeResult) => {
        setResult(data)
        setStatus('done')
        onResult?.(data)
      })
      .catch(() => {
        setStatus('idle')
        onResult?.(null)
      })
  }, [pincode, onResult])

  if (status === 'idle') return null

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Loader2 size={14} className="animate-spin text-on-surface-variant" />
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Checking delivery charge…
        </span>
      </div>
    )
  }

  if (!result) return null

  // Same rule the order summary and the order API use.
  const charge = subtotal != null
    ? computeDeliveryFee(subtotal, result.delivery_charge ?? null, config)
    : result.delivery_charge ?? DEFAULT_PINCODE_DELIVERY_FEE
  const freeAbove = config.freeDeliveryMin.toLocaleString('en-IN')

  return (
    <div className="flex items-center gap-2 mt-2">
      <CheckCircle2 size={15} className="text-success flex-shrink-0" />
      <span className="font-label-sm text-label-sm text-success">
        Delivery available
        {result.city ? ` to ${result.city}${result.state ? `, ${result.state}` : ''}` : ''}
        {' — '}
        {charge === 0
          ? (subtotal != null && subtotal >= config.freeDeliveryMin ? `free on this order (above ₹${freeAbove})` : 'free')
          : subtotal != null
            ? `₹${charge.toLocaleString('en-IN')} (free above ₹${freeAbove})`
            : `₹${charge.toLocaleString('en-IN')}, free on orders above ₹${freeAbove}`}
        {result.delivery_days ? ` (${result.delivery_days} day${result.delivery_days > 1 ? 's' : ''})` : ''}
      </span>
    </div>
  )
}
