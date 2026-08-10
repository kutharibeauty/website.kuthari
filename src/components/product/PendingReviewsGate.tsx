'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Star, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import type { PendingReviewProduct } from '@/app/api/reviews/pending/route'

/**
 * Mandatory review gate.
 *
 * When a customer opens the site with products they've received but not
 * reviewed, this asks for a rating on each in turn. Per the client's spec there
 * is deliberately NO close, cancel or back control — the only way past it is to
 * rate every product.
 *
 * Escape hatches that exist only to prevent a permanent trap (never a way to
 * skip an unrated product):
 *   • a product the API rejects as unpurchased is stepped over, otherwise a bad
 *     row would wedge the customer behind a popup they cannot satisfy;
 *   • checkout lives outside the (shop) group, so this can never block a sale.
 */
export default function PendingReviewsGate() {
  const [queue, setQueue] = useState<PendingReviewProduct[]>([])
  const [idx, setIdx] = useState(0)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { isSignedIn, isLoaded } = useSupabaseUser()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    // The endpoint is session-scoped and 401s for a signed-out visitor. Firing
    // it unconditionally logged a console error on every logged-out page load,
    // so wait until the session is resolved and only ask when signed in.
    // Behaviour for a signed-in customer is unchanged.
    if (!isLoaded || !isSignedIn) return

    let cancelled = false
    void (async () => {
      // Don't crash the celebration on a brand-new order — that page owns the
      // screen. The gate will come up on their next visit.
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') return
      try {
        const res = await fetch('/api/reviews/pending')
        if (!res.ok) return
        const { products } = (await res.json()) as { products: PendingReviewProduct[] }
        if (!cancelled && products?.length) setQueue(products)
      } catch { /* storefront must work regardless */ }
    })()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn])

  const open = queue.length > 0 && idx < queue.length

  // Lock background scroll while the gate is up.
  useEffect(() => {
    if (!open && !done) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, done])

  const current = queue[idx]

  const advance = useCallback(() => {
    setRating(0); setHovered(0); setBody(''); setError('')
    if (idx + 1 >= queue.length) {
      setDone(true)
      setIdx(queue.length)
      setTimeout(() => { setDone(false); setQueue([]) }, 2200)
    } else {
      setIdx((i) => i + 1)
    }
  }, [idx, queue.length])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!current) return
    if (!rating) { setError('Please select a rating.'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${current.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, body: body.trim() }),
      })
      if (res.status === 403 || res.status === 409) { advance(); return }  // can't review it — don't wedge them here
      if (!res.ok) throw new Error()
      advance()
    } catch {
      setError('Could not submit your review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted || (!open && !done)) return null

  const gate = (
    <AnimatePresence>
      <motion.div
        key="review-gate"
        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-gate-title"
      >
        <motion.div
          className="w-full sm:max-w-md bg-surface-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-table-border overflow-hidden max-h-[92dvh] flex flex-col"
          initial={{ y: 40, scale: 0.97, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        >
          <div className="h-1 w-full bg-primary" />

          {done ? (
            <div className="p-8 text-center flex flex-col items-center">
              <motion.div
                className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-4"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              >
                <Check size={32} className="text-on-primary" strokeWidth={2.5} />
              </motion.div>
              <p className="text-xl font-black text-primary">Thank you!</p>
              <p className="text-sm font-medium text-on-surface-variant mt-1">
                Your reviews will appear once approved.
              </p>
            </div>
          ) : current ? (
            <>
              <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-table-border">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="review-gate-title" className="text-base font-black text-primary uppercase tracking-wider">
                    Rate your purchase
                  </h2>
                  {queue.length > 1 && (
                    <span className="text-[11px] font-black text-on-surface-variant/60 tabular-nums shrink-0">
                      {idx + 1} of {queue.length}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-on-surface-variant/70 mt-1">
                  You received these items — please rate {queue.length > 1 ? 'each of them' : 'it'} to continue.
                </p>
                {queue.length > 1 && (
                  <div className="mt-3 h-1 w-full rounded-full bg-surface-container overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={false}
                      animate={{ width: `${(idx / queue.length) * 100}%` }}
                      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                    />
                  </div>
                )}
              </div>

              <form
                onSubmit={submit}
                className="px-5 sm:px-6 py-5 flex flex-col gap-5 overflow-y-auto overscroll-contain"
                style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
              >
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current.image ?? ''}
                    alt=""
                    className="w-14 h-14 rounded-xl object-contain bg-surface-container border border-table-border shrink-0"
                  />
                  <p className="font-black text-sm text-primary leading-snug line-clamp-2">{current.name}</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 block mb-2">
                    Your rating *
                  </label>
                  <div className="flex gap-1.5" onMouseLeave={() => setHovered(0)}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseEnter={() => setHovered(s)}
                        onClick={() => { setRating(s); setError('') }}
                        className="transition-transform hover:scale-110 active:scale-95"
                        aria-label={`${s} star${s > 1 ? 's' : ''}`}
                        aria-pressed={rating === s}
                      >
                        <Star
                          size={32}
                          className={cn(
                            'transition-colors',
                            s <= (hovered || rating) ? 'fill-secondary stroke-secondary' : 'fill-none stroke-outline',
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="gate-review-body"
                    className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 block mb-1.5"
                  >
                    Your review <span className="text-on-surface-variant/40">(optional)</span>
                  </label>
                  <textarea
                    id="gate-review-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="How was the quality, packaging and delivery?"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-table-border bg-surface text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                {error && <p className="text-xs font-bold text-error">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 shadow-sm"
                >
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  {submitting
                    ? 'Submitting…'
                    : idx + 1 >= queue.length ? 'Submit review' : 'Submit & next'}
                </button>
              </form>
            </>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(gate, document.body)
}
