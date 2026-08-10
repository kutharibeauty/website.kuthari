'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Tag, X, ChevronRight } from 'lucide-react'
import { useT } from '@/hooks/useT'

/** Shown inline up to this many coupons; beyond it they move behind "View all". */
const INLINE_LIMIT = 2

interface PickerCoupon {
  id: string
  code: string
  description: string | null
  description_or: string | null
  discount_type: 'percentage' | 'flat'
  discount_value: number
  min_order_value: number | null
  max_discount: number | null
  max_uses: number | null
  uses_count: number | null
  valid_until: string | null
}

interface Props {
  /** Current cart subtotal — decides which coupons the order already qualifies for. */
  subtotal: number
  /** Code currently applied, so it isn't offered again. */
  appliedCode?: string | null
  /** Applies a code through the cart's own validation. */
  onApply: (code: string) => void
}

const labelFor = (c: PickerCoupon) =>
  c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`

export default function CartCouponPicker({ subtotal, appliedCode, onApply }: Props) {
  const { tField } = useT()
  const [coupons, setCoupons] = useState<PickerCoupon[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    let active = true
    fetch('/api/coupons')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PickerCoupon[]) => {
        if (!active || !Array.isArray(data)) return
        const now = new Date()
        // Only offer coupons the customer could actually redeem: still active
        // (the endpoint already filters that), not expired, not globally used up.
        setCoupons(
          data.filter(
            (c) =>
              !(c.valid_until && new Date(c.valid_until) < now) &&
              !(c.max_uses != null && (c.uses_count ?? 0) >= c.max_uses),
          ),
        )
      })
      .catch(() => {
        /* the manual code box still works */
      })
    return () => {
      active = false
    }
  }, [])

  const available = coupons.filter((c) => c.code.toUpperCase() !== (appliedCode ?? '').toUpperCase())
  if (available.length === 0) return null

  const apply = (code: string) => {
    onApply(code)
    setSheetOpen(false)
  }

  const Row = ({ c, compact }: { c: PickerCoupon; compact?: boolean }) => {
    // Below the coupon's minimum the customer can't use it yet — show what's
    // still needed instead of letting them tap into an error.
    const short = c.min_order_value != null && subtotal < c.min_order_value
    const desc = c.description ? tField(c.description, c.description_or) : null

    return (
      <div
        className={`flex items-center gap-3 rounded-xl border-2 border-dashed border-primary/25 bg-primary/[0.03] px-3 py-2.5 ${
          compact ? '' : 'mb-2 last:mb-0'
        }`}
      >
        <Tag size={15} className="text-primary flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-black text-xs text-primary tracking-wide truncate">
            {c.code} <span className="text-on-surface-variant">· {labelFor(c)}</span>
          </p>
          {short ? (
            <p className="text-[10px] font-bold text-on-surface-variant/80 mt-0.5">
              Add ₹{(c.min_order_value! - subtotal).toLocaleString('en-IN')} more to use this
            </p>
          ) : (
            desc && (
              <p className="text-[10px] font-medium text-on-surface-variant/80 mt-0.5 line-clamp-1">{desc}</p>
            )
          )}
        </div>
        <button
          type="button"
          onClick={() => apply(c.code)}
          disabled={short}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-primary text-white font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </div>
    )
  }

  const sheet = (
    <AnimatePresence>
      {sheetOpen && (
        <motion.div
          key="coupon-sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSheetOpen(false)}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Available coupons"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-surface rounded-t-3xl p-5 shadow-2xl max-h-[85dvh] overflow-y-auto overscroll-contain"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto w-10 h-1.5 rounded-full bg-outline-variant/40 mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-sm text-primary uppercase tracking-widest">
                Available Coupons
              </h2>
              <button
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            {available.map((c) => (
              <div key={c.id} className="mb-2 last:mb-0">
                <Row c={c} compact />
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <section className="bg-surface-card rounded-2xl border-2 border-table-border p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-primary mb-3">
        {available.length === 1 ? 'Available Coupon' : 'Available Coupons'}
      </p>

      {/* One or two fit inline; more go behind a sheet so the cart stays short. */}
      {available.slice(0, INLINE_LIMIT).map((c) => (
        <Row key={c.id} c={c} />
      ))}

      {available.length > INLINE_LIMIT && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="mt-2 w-full flex items-center justify-center gap-1 py-2.5 rounded-xl border-2 border-table-border font-black text-[10px] uppercase tracking-widest text-primary hover:border-primary/40 transition-colors active:scale-[0.99]"
        >
          View all {available.length} coupons
          <ChevronRight size={14} />
        </button>
      )}

      {mounted && createPortal(sheet, document.body)}
    </section>
  )
}
