'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '@/hooks/useT'
import type { Banner } from '@/types/database.types'

/** Used when a banner has no display_seconds, matching the old fixed timing. */
const DEFAULT_SECONDS = 5
const MIN_SECONDS = 1
const MAX_SECONDS = 60

/** Clamp to the range the DB CHECK enforces, so a bad value can't freeze the
 *  carousel or spin it continuously. */
function holdMs(banner: Banner | undefined): number {
  const raw = Number(banner?.display_seconds)
  const secs = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SECONDS
  return Math.min(Math.max(secs, MIN_SECONDS), MAX_SECONDS) * 1000
}

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

/**
 * The admin's hero banners (Banners & CMS → placement "hero") as the homepage's
 * full-width carousel, with arrows, dots and swipe, each banner held for its
 * own display_seconds. Banners are 5:2 artwork with their text baked in, and
 * the panel is 5:2 too, so each fills it edge to edge. Hover or focus pauses it.
 */
export default function HeroBannerPanel({ banners }: { banners: Banner[] }) {
  const { tField } = useT()
  const reduceMotion = useReducedMotion()
  const [[index, dir], setState] = useState<[number, number]>([0, 1])
  const [held, setHeld] = useState(false)
  const touchX = useRef(0)

  const go = useCallback(
    (next: number, direction: number) =>
      setState([(next + banners.length) % banners.length, direction]),
    [banners.length],
  )

  useEffect(() => {
    if (banners.length <= 1 || held || reduceMotion) return
    const id = setTimeout(() => go(index + 1, 1), holdMs(banners[index]))
    return () => clearTimeout(id)
  }, [index, banners, held, reduceMotion, go])

  if (!banners.length) return null

  const b = banners[index]
  const title = b.title ? tField(b.title, b.title_or) : null
  const alt = title || 'Kuthari Beauty Store offer'

  const art = (
    <>
      {/* The panel is the banners' own 5:2 shape, so the artwork fills it edge to edge. */}
      {b.image_url && (
        <Image src={b.image_url} alt={alt} fill priority={index === 0} sizes="(max-width: 1440px) 100vw, 1360px" className="object-cover" />
      )}
      {!b.image_url && title && (
        <span className="absolute inset-0 flex items-center p-8" style={{ backgroundColor: b.background_color || undefined }}>
          <span className="display text-[clamp(2rem,1.4rem+2.6vw,3.5rem)]" style={{ color: b.text_color || undefined }}>
            {title}
          </span>
        </span>
      )}
    </>
  )

  return (
    <div
      className="relative h-full select-none overflow-hidden rounded-[var(--radius-panel)] bg-periwinkle"
      aria-roledescription="carousel"
      aria-label="Offers"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        const diff = touchX.current - e.changedTouches[0].clientX
        if (diff > 50) go(index + 1, 1)
        else if (diff < -50) go(index - 1, -1)
      }}
    >
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={index}
          custom={dir}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${banners.length}`}
        >
          {b.link_url ? (
            <Link href={b.link_url} className="absolute inset-0" aria-label={alt}>
              {art}
            </Link>
          ) : (
            art
          )}
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1, -1)}
            aria-label="Previous offer"
            className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-paper-raised/90 text-ink shadow-[var(--shadow-card)] hover:bg-ink hover:text-paper-raised transition-colors active:scale-95"
          >
            <ChevronLeft size={19} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1, 1)}
            aria-label="Next offer"
            className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-paper-raised/90 text-ink shadow-[var(--shadow-card)] hover:bg-ink hover:text-paper-raised transition-colors active:scale-95"
          >
            <ChevronRight size={19} strokeWidth={2.25} />
          </button>
          <div className="absolute bottom-4 md:bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((x, i) => (
              <button
                key={x.id}
                type="button"
                onClick={() => go(i, i > index ? 1 : -1)}
                aria-label={`Offer ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className="flex h-6 items-center"
              >
                <span
                  className={`block h-[4px] rounded-full transition-[background-color,transform] duration-500 origin-left ${
                    i === index ? 'w-8 bg-ink' : 'w-4 bg-ink/30 hover:bg-ink/50'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
