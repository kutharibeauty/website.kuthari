'use client'

import { useState } from 'react'
import { useT } from '@/hooks/useT'
import StarRating from '@/components/ui/StarRating'
import RatingBreakdown from './RatingBreakdown'
import ReviewPopup from './ReviewPopup'
import type { ProductReview } from '@/types/database.types'
import type { RatingStats } from '@/lib/data/product'

interface Props {
  productId: string
  productName: string
  reviews: ProductReview[]
  stats: RatingStats
}

function ReviewCard({ review }: { review: ProductReview }) {
  const { tField } = useT()
  const body = tField(review.body ?? '', review.body_or)
  const date = new Date(review.created_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-label-sm text-label-sm text-on-surface">{review.reviewer_name}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">{date}</p>
        </div>
        <StarRating rating={review.rating} size={14} className="text-secondary flex-shrink-0" />
      </div>
      {body && (
        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{body}</p>
      )}
    </div>
  )
}

export default function ProductReviews({ productId, productName, reviews, stats }: Props) {
  const [showPopup, setShowPopup] = useState(false)

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-0 py-8 border-t border-outline-variant">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface">Customer Reviews</h2>
        <button
          onClick={() => setShowPopup(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border-[1.5px] border-primary text-primary hover:bg-surface-container font-label-sm text-label-sm uppercase tracking-wider transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">rate_review</span>
          Write a Review
        </button>
      </div>

      {stats.count > 0 ? (
        <>
          <div className="mb-6">
            <RatingBreakdown stats={stats} />
          </div>

          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-surface-container-low rounded-xl">
          <span
            className="material-symbols-outlined text-[48px] text-outline mb-3 block"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            rate_review
          </span>
          <p className="font-body-lg text-body-lg text-on-surface-variant">No reviews yet.</p>
          <p className="font-body-md text-body-md text-on-surface-variant/70 mt-1">
            Be the first to review {productName}
          </p>
        </div>
      )}

      {showPopup && (
        <ReviewPopup
          productId={productId}
          productName={productName}
          onClose={() => setShowPopup(false)}
        />
      )}
    </section>
  )
}
