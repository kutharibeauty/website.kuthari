import StarRating from '@/components/ui/StarRating'
import type { RatingStats } from '@/lib/data/product'

interface Props {
  stats: RatingStats
}

export default function RatingBreakdown({ stats }: Props) {
  const { avg, count, breakdown } = stats

  return (
    <div className="flex gap-6 items-start">
      {/* Overall */}
      <div className="flex flex-col items-center gap-1 min-w-[72px]">
        <span className="font-headline-lg text-headline-lg text-primary leading-none">
          {avg.toFixed(1)}
        </span>
        <StarRating rating={avg} size={14} className="text-secondary" />
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {count} {count === 1 ? 'review' : 'reviews'}
        </span>
      </div>

      {/* Breakdown bars */}
      <div className="flex-1 flex flex-col gap-1.5">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const pct = count > 0 ? Math.round((breakdown[star] / count) * 100) : 0
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant w-3 text-right">
                {star}
              </span>
              <span
                className="material-symbols-outlined text-secondary text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full rounded-full bg-secondary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant w-7 text-right">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
