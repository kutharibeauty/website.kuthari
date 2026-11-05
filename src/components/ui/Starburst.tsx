/** The marquee separator: a small twelve-ray burst. Decorative, icon size. */
export default function Starburst({ className = 'w-4 h-4' }: { className?: string }) {
  const rays = Array.from({ length: 12 }, (_, i) => (i * 360) / 12)
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {rays.map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="12"
          x2="12"
          y2="1.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
    </svg>
  )
}
