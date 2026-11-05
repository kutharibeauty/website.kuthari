import Image from 'next/image'

interface LogoProps {
  className?: string
  priority?: boolean
  /**
   * Rendered width hint for the browser's srcset pick. Defaults to the largest
   * of the small usages (h-16 => ~53px wide). The footer renders this far bigger
   * and passes its own, otherwise it would be served a blurry variant.
   */
  sizes?: string
  /**
   * "mark" (default) — just the mirror icon, no text baked into the pixels.
   * Pair it with a live text wordmark wherever the brand name needs to show,
   * so the name can change without needing new artwork. "full" is the
   * original icon+wordmark lockup image, kept for any context that wants the
   * literal supplied artwork as-is.
   */
  variant?: 'mark' | 'full'
}

// Intrinsic sizes of the trimmed source files — keeps the aspect ratio correct
// no matter what height/width the caller applies via className.
const SIZES = {
  mark: { src: '/images/logo-icon.webp', width: 364, height: 498, alt: 'Kuthari Beauty Store' },
  full: { src: '/images/logo-trimmed.webp', width: 815, height: 779, alt: 'Kuthari Beauty Store' },
} as const

export default function Logo({ className = 'h-10 w-auto', priority, sizes = '64px', variant = 'mark' }: LogoProps) {
  const { src, width, height, alt } = SIZES[variant]
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  )
}

/**
 * The crest lockup used across the site: the mirror mark beside KUTHARI set in
 * the serif, with "Beauty store" under it, echoing the supplied logo artwork.
 * `tone="light"` is for navy grounds.
 */
export function BrandLockup({
  size = 'md',
  tone = 'dark',
  priority,
}: {
  size?: 'sm' | 'md' | 'lg'
  tone?: 'dark' | 'light'
  priority?: boolean
}) {
  const mark = { sm: 'h-10', md: 'h-12', lg: 'h-20' }[size]
  const word = { sm: 'text-[22px]', md: 'text-[26px]', lg: 'text-[44px]' }[size]
  const sub = { sm: 'text-[10px]', md: 'text-[10px]', lg: 'text-[13px]' }[size]
  return (
    <span className="flex items-center gap-2.5">
      <Logo className={`${mark} w-auto`} priority={priority} sizes={size === 'lg' ? '64px' : '40px'} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-serif not-italic font-semibold uppercase tracking-[0.06em] ${word} ${
            tone === 'light' ? 'text-paper-raised' : 'text-ink'
          }`}
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 0" }}
        >
          Kuthari
        </span>
        <span
          className={`mt-1 font-sans font-semibold uppercase tracking-[0.28em] ${sub} ${
            tone === 'light' ? 'text-periwinkle' : 'text-indigo'
          }`}
        >
          Beauty store
        </span>
      </span>
    </span>
  )
}
