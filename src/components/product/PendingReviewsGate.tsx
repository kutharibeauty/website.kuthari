'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Star, Loader2, X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import type { PendingReviewProduct } from '@/app/api/reviews/pending/route'

const GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJ-ccrQRtQPToRSU6_TG62QZs'
const SKIP_KEY = 'kbs-review-skips'
const SKIP_DAYS = 7
const QUICK_TAGS = ['Great quality', 'Value for money', 'Packed well', 'Fast delivery', 'Would buy again']
const WORDS = ['', 'Poor', 'Okay', 'Good', 'Very good', 'Loved it']

/** Product ids the customer said "not now" to, and when. */
function readSkips(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SKIP_KEY) || '{}') as Record<string, number>
  } catch {
    return {}
  }
}
function writeSkips(ids: string[]) {
  try {
    const all = readSkips()
    const now = Date.now()
    ids.forEach((id) => { all[id] = now })
    localStorage.setItem(SKIP_KEY, JSON.stringify(all))
  } catch { /* private mode: they'll simply be asked again next visit */ }
}

/**
 * The quick review after a delivery. One sheet per received product: tap a
 * star, optionally tap a tag or two, send. "Not now" skips it for a week, and
 * the close button skips the rest. After a review it offers the shop's Google
 * review link. Never shown on a brand-new order's page or at checkout.
 */
export default function PendingReviewsGate() {
  const [queue, setQueue] = useState<PendingReviewProduct[]>([])
  const [idx, setIdx] = useState(0)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [rated, setRated] = useState(0)
  const [finished, setFinished] = useState(false)
  const { isSignedIn, isLoaded } = useSupabaseUser()

  useEffect(() => {
    // Signed-in customers only; the endpoint 401s otherwise.
    if (!isLoaded || !isSignedIn) return
    if (new URLSearchParams(window.location.search).get('new') === '1') return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/reviews/pending')
        if (!res.ok) return
        const { products } = (await res.json()) as { products: PendingReviewProduct[] }
        const skips = readSkips()
        const fresh = (products ?? []).filter((p) => !skips[p.id] || Date.now() - skips[p.id] > SKIP_DAYS * 86400000)
        if (!cancelled && fresh.length) setQueue(fresh)
      } catch { /* the store must work regardless */ }
    })()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn])

  const current = queue[idx]
  const open = !!current || finished

  const next = () => {
    setRating(0); setHovered(0); setTags([]); setNote(''); setError('')
    if (idx + 1 >= queue.length) {
      setIdx(queue.length)
      setFinished(true)
    } else {
      setIdx((i) => i + 1)
    }
  }

  const skipOne = () => {
    if (current) writeSkips([current.id])
    next()
  }

  const closeAll = () => {
    writeSkips(queue.slice(idx).map((p) => p.id))
    setQueue([])
    setFinished(false)
  }

  const send = async () => {
    if (!current || !rating) return
    setSubmitting(true)
    setError('')
    const text = [tags.join(', '), note.trim()].filter(Boolean).join('. ')
    try {
      const res = await fetch(`/api/products/${current.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, body: text }),
      })
      if (res.ok) setRated((n) => n + 1)
      // Already reviewed or not eligible: move on rather than trap them.
      if (res.ok || res.status === 403 || res.status === 409) next()
      else setError('Could not send your review. Please try again.')
    } catch {
      setError('Could not send your review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Nothing opens until the client-side fetch fills the queue, so this never
  // renders on the server and createPortal always has a document.
  if (!open) return null

  const shown = hovered || rating

  const sheet = (
    <AnimatePresence>
      <motion.div
        key="quick-review"
        className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) closeAll() }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-review-title"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="relative w-full max-w-md rounded-t-[1.75rem] bg-paper-raised p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-modal)] sm:rounded-[1.75rem]"
        >
          <button
            type="button"
            onClick={closeAll}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-paper-sunk hover:text-ink"
            aria-label="Close, I'll review later"
          >
            <X size={18} />
          </button>

          {current ? (
            <>
              <p className="text-[14px] font-semibold text-indigo">
                {queue.length > 1 ? `Item ${idx + 1} of ${queue.length}` : 'Your recent order'}
              </p>
              <div className="mt-3 flex items-center gap-3 pr-8">
                {current.image && (
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-paper-sunk">
                    <Image src={current.image} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                )}
                <h2 id="quick-review-title" className="text-[19px] font-bold leading-snug text-ink capitalize">
                  How was {current.name}?
                </h2>
              </div>

              <div className="mt-5 flex items-center justify-between" onMouseLeave={() => setHovered(0)}>
                <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHovered(n)}
                      className="p-1 transition-transform active:scale-90"
                    >
                      <Star size={36} strokeWidth={1.75} className={n <= shown ? 'fill-indigo text-indigo' : 'text-lavender'} />
                    </button>
                  ))}
                </div>
                <span className="text-[15px] font-semibold text-ink">{WORDS[shown]}</span>
              </div>

              {rating > 0 && (
                <div className="mt-4 animate-drop-in">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TAGS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={tags.includes(t)}
                        onClick={() => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))}
                        className={cn(
                          'rounded-full border px-3.5 py-2 text-[14px] font-semibold transition-colors',
                          tags.includes(t) ? 'border-ink bg-ink text-paper-raised' : 'border-line text-ink hover:border-ink',
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Anything else? (optional)"
                    className="mt-3 w-full resize-none rounded-xl border border-line bg-paper px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
                  />
                </div>
              )}

              {error && <p className="mt-2 text-[14px] font-semibold text-error">{error}</p>}

              <div className="mt-5 flex items-center gap-3">
                <button type="button" onClick={skipOne} className="btn-pill flex-1 !bg-transparent !text-ink border border-line hover:!border-ink">
                  Not now
                </button>
                <button type="button" onClick={send} disabled={!rating || submitting} className="btn-pill flex-1">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Send review'}
                </button>
              </div>
            </>
          ) : (
            <div className="pr-8">
              <h2 id="quick-review-title" className="display text-[40px]">{rated > 0 ? 'Thank you' : 'All done'}</h2>
              <p className="accent-line text-[30px]">{rated > 0 ? 'for the stars.' : 'see you soon.'}</p>
              <p className="mt-4 text-[16px] leading-relaxed text-ink/80">
                Would you rate the shop on Google too? It takes a few seconds and helps people near Sano Bazar find us.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href={GOOGLE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeAll}
                  className="btn-pill flex-1"
                >
                  Rate us on Google <ExternalLink size={16} aria-hidden="true" />
                </a>
                <button type="button" onClick={closeAll} className="btn-pill flex-1 !bg-transparent !text-ink border border-line hover:!border-ink">
                  Maybe later
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(sheet, document.body)
}
