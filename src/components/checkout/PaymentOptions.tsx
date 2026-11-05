'use client'

import { cn } from '@/lib/utils'
import type { PaymentMode } from '@/lib/cart/delivery'
import PaymentBadges from '@/components/layout/PaymentBadges'

interface Props {
  modes: PaymentMode[]
  value: PaymentMode | null
  onChange: (m: PaymentMode) => void
  total: number
  /** Rupees paid online up front for a part-paid order. */
  advance: number
  advancePercent: number
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

/**
 * The payment choice at checkout. Shows only what the admin has switched on
 * (Settings → Payments) and what this order qualifies for; the order route
 * enforces the same rule.
 */
export default function PaymentOptions({ modes, value, onChange, total, advance, advancePercent }: Props) {
  if (!modes.length) {
    return (
      <div className="rounded-2xl border-2 border-error/40 bg-error/5 p-4">
        <p className="font-bold text-[15px] text-error">Ordering is paused</p>
        <p className="mt-1 text-[14px] text-on-surface-variant">
          Payments aren&apos;t switched on right now, so orders can&apos;t be placed. Please contact us directly.
        </p>
      </div>
    )
  }

  const copy: Record<PaymentMode, { title: string; line: string }> = {
    online: { title: 'Pay online', line: `${inr(total)} now by UPI, card or net banking, through Razorpay.` },
    partial: {
      title: `Pay ${advancePercent}% now, the rest on delivery`,
      line: `${inr(advance)} online now, ${inr(total - advance)} in cash when your bulk order arrives.`,
    },
    cod: { title: 'Cash on delivery', line: `Pay ${inr(total)} in cash when the order arrives.` },
  }

  return (
    <div className="grid gap-3" role="radiogroup" aria-label="Payment method">
      {modes.map((m) => {
        const active = value === m
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m)}
            className={cn(
              'flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-colors',
              active ? 'border-primary bg-primary/[0.04]' : 'border-table-border hover:border-primary/40',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                active ? 'border-primary' : 'border-on-surface-variant/40',
              )}
              aria-hidden="true"
            >
              {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </span>
            <span>
              <span className="block font-bold text-[15px] text-primary">{copy[m].title}</span>
              <span className="mt-1 block text-[14px] text-on-surface-variant">{copy[m].line}</span>
            </span>
          </button>
        )
      })}
      {modes.some((m) => m !== 'cod') && <PaymentBadges tone="light" className="mt-1" />}
    </div>
  )
}
