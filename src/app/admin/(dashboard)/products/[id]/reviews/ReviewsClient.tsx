'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ProductReview } from '@/types/database.types'

type Filter = 'all' | 'approved' | 'pending'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'material-symbols-outlined text-[16px]',
            i < rating ? 'text-amber-400' : 'text-surface-container-highest',
          )}
          style={{ fontVariationSettings: i < rating ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      ))}
    </div>
  )
}

export default function ReviewsClient({
  productId,
  productName,
  initialReviews,
  tableExists,
}: {
  productId: string
  productName: string
  initialReviews: ProductReview[]
  tableExists: boolean
}) {
  const [reviews, setReviews] = useState(initialReviews)
  const [filter, setFilter] = useState<Filter>('all')
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() => {
    if (filter === 'approved') return reviews.filter(r => r.is_approved)
    if (filter === 'pending')  return reviews.filter(r => !r.is_approved)
    return reviews
  }, [reviews, filter])

  const counts = useMemo(() => ({
    all: reviews.length,
    approved: reviews.filter(r => r.is_approved).length,
    pending: reviews.filter(r => !r.is_approved).length,
  }), [reviews])

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  async function toggleApprove(id: string, current: boolean) {
    setToggling(id)
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: !current }),
    })
    if (res.ok) {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: !current } : r))
      showToast(!current ? 'Review approved' : 'Review hidden')
    }
    setToggling(null)
  }

  async function deleteReview(id: string) {
    if (!confirm('Delete this review permanently?')) return
    setDeleting(id)
    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setReviews(prev => prev.filter(r => r.id !== id))
      showToast('Review deleted')
    }
    setDeleting(null)
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'approved', label: 'Approved' },
    { key: 'pending',  label: 'Pending' },
  ]

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-3xl mx-auto w-full pb-12 space-y-gutter">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/products/${productId}`}
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="font-headline-md text-headline-md text-primary">Reviews</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{productName}</p>
          </div>
        </div>

        {/* Summary stats */}
        {reviews.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-headline-md text-headline-md text-primary">{avgRating}</span>
                <span className="material-symbols-outlined text-amber-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
            </div>
            {/* Rating distribution bar */}
            <div className="hidden sm:flex flex-col gap-0.5 w-24">
              {[5,4,3,2,1].map(n => {
                const count = reviews.filter(r => r.rating === n).length
                const pct = reviews.length ? (count / reviews.length) * 100 : 0
                return (
                  <div key={n} className="flex items-center gap-1.5">
                    <span className="font-label-sm text-label-sm text-on-surface-variant w-2">{n}</span>
                    <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── DB migration notice ── */}
      {!tableExists && (
        <div className="flex items-start gap-3 px-4 py-4 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="material-symbols-outlined text-amber-600 text-[20px] flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
          <div>
            <p className="font-body-md text-body-md text-amber-800 font-medium">DB Migration Required</p>
            <p className="font-body-md text-body-md text-amber-700 mt-0.5">
              The <code className="bg-amber-100 px-1 rounded">reviews</code> table does not exist yet. Run the migration to enable review management.
            </p>
          </div>
        </div>
      )}

      {/* ── Filter tabs ── */}
      {tableExists && (
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full font-body-md text-body-md transition-colors',
                filter === f.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {f.label}
              <span className={cn(
                'px-1.5 py-0.5 rounded-full font-label-sm text-label-sm text-[11px]',
                filter === f.key
                  ? 'bg-on-primary/20 text-on-primary'
                  : 'bg-surface-container-highest text-on-surface-variant',
              )}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Reviews list ── */}
      {!tableExists || filtered.length === 0 ? (
        <div className="py-20 text-center bg-surface rounded-2xl border border-outline-variant/50">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>reviews</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-3">
            {!tableExists ? 'Reviews unavailable until migration runs.' : 'No reviews match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(review => (
            <div
              key={review.id}
              className={cn(
                'bg-surface rounded-2xl border p-5 space-y-3 transition-opacity',
                review.is_approved ? 'border-outline-variant/50' : 'border-amber-200 bg-amber-50/30',
              )}
              style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.06)' }}
            >
              {/* Review header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                    <span className="font-label-md text-label-md text-primary font-bold">
                      {review.reviewer_name[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-body-md text-body-md text-on-surface font-medium leading-tight">
                      {review.reviewer_name}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {new Date(review.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status badge */}
                  <span className={cn(
                    'px-2.5 py-1 rounded-full font-label-sm text-label-sm',
                    review.is_approved
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700',
                  )}>
                    {review.is_approved ? 'Approved' : 'Pending'}
                  </span>

                  {/* Approve toggle */}
                  <button
                    onClick={() => toggleApprove(review.id, review.is_approved)}
                    disabled={toggling === review.id}
                    title={review.is_approved ? 'Hide review' : 'Approve review'}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors disabled:opacity-50',
                      review.is_approved
                        ? 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        : 'bg-green-600 text-white hover:bg-green-700',
                    )}
                  >
                    {toggling === review.id ? (
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {review.is_approved ? 'visibility_off' : 'check_circle'}
                      </span>
                    )}
                    {review.is_approved ? 'Hide' : 'Approve'}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteReview(review.id)}
                    disabled={deleting === review.id}
                    title="Delete review"
                    className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {deleting === review.id ? 'progress_activity' : 'delete'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Rating */}
              <Stars rating={review.rating} />

              {/* Body */}
              {review.body && (
                <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                  {review.body}
                </p>
              )}

              {/* Odia body */}
              {review.body_or && (
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed border-t border-outline-variant/20 pt-3">
                  {review.body_or}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-on-surface text-surface rounded-full font-body-md text-body-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
