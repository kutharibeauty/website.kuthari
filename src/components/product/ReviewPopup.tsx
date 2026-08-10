'use client'

import { useState } from 'react'
import { X, Star, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  productId: string
  productName: string
  onClose: () => void
}

export default function ReviewPopup({ productId, productName, onClose }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) { setError('Please select a rating.'); return }
    if (!name.trim()) { setError('Please enter your name.'); return }
    setError('')
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, reviewer_name: name.trim(), body: body.trim() }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-surface rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant flex-shrink-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">Write a Review</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-on-surface-variant" />
          </button>
        </div>

        <div
          className="px-5 py-4 overflow-y-auto"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {submitted ? (
            <div className="text-center py-8">
              <span
                className="material-symbols-outlined text-[48px] text-primary block mb-3"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <p className="font-headline-md text-headline-md text-on-surface">Thank you!</p>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Your review will appear after approval.
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-6 py-2.5 bg-primary text-on-primary rounded-full font-label-sm text-label-sm uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="font-body-md text-body-md text-on-surface-variant line-clamp-1">
                {productName}
              </p>

              {/* Star picker */}
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-2 uppercase tracking-wider">
                  Your Rating *
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110"
                      aria-label={`${s} star${s > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={28}
                        className={cn(
                          'transition-colors',
                          s <= (hovered || rating)
                            ? 'fill-secondary stroke-secondary'
                            : 'fill-none stroke-outline',
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="reviewer-name"
                  className="font-label-sm text-label-sm text-on-surface-variant block mb-1.5 uppercase tracking-wider"
                >
                  Your Name *
                </label>
                <input
                  id="reviewer-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ravi Kumar"
                  maxLength={80}
                  className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Body */}
              <div>
                <label
                  htmlFor="review-body"
                  className="font-label-sm text-label-sm text-on-surface-variant block mb-1.5 uppercase tracking-wider"
                >
                  Your Review
                </label>
                <textarea
                  id="review-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share your experience with this product…"
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {error && (
                <p className="font-label-sm text-label-sm text-error">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary text-on-primary rounded-full font-label-sm text-label-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                {isSubmitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
