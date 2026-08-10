interface Props {
  rating: number
  max?: number
  size?: number
  className?: string
}

export default function StarRating({ rating, max = 5, size = 16, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= Math.floor(rating)
        const half = !filled && i < rating
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`half-${i}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="none" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={filled ? 'currentColor' : half ? `url(#half-${i})` : 'none'}
              stroke="currentColor"
              strokeWidth={filled || half ? 0 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )
      })}
    </span>
  )
}
