'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useFlyToCartStore } from '@/store/flyToCartStore'

/** Several bag icons exist (desktop header, phone header, bottom bar); only
 *  some are on screen. Pick the first one that is actually visible. */
function getCartTarget(): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>('[data-cart-target]')
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) return el
  }
  return null
}

interface ActiveFlight {
  id: string
  image: string
  from: DOMRect
  to: DOMRect
  target: HTMLElement
}

/**
 * Mounted once near the app root. A thumbnail of the product arcs from the
 * Add button into the bag icon, which then gives a small bump. Transform and
 * opacity only, so it stays smooth on slow phones. Purely visual: it never
 * touches cart state. Skipped under reduced motion.
 */
export default function FlyToCartLayer() {
  const flight = useFlyToCartStore((s) => s.flight)
  const clear = useFlyToCartStore((s) => s.clear)
  const [active, setActive] = useState<ActiveFlight | null>(null)

  useEffect(() => {
    if (!flight) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = getCartTarget()
    if (target && !reduce) {
      setActive({ id: flight.id, image: flight.image, from: flight.fromRect, to: target.getBoundingClientRect(), target })
    }
    clear()
  }, [flight, clear])

  const land = () => {
    active?.target.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(0.96)' }, { transform: 'scale(1)' }],
      { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    )
    setActive(null)
  }

  if (!active) return null

  // Fly a fixed-size chip from the button's centre to the bag's centre.
  const size = Math.min(72, Math.max(40, active.from.width * 0.5))
  const fromX = active.from.left + active.from.width / 2 - size / 2
  const fromY = active.from.top + active.from.height / 2 - size / 2
  const dx = active.to.left + active.to.width / 2 - size / 2 - fromX
  const dy = active.to.top + active.to.height / 2 - size / 2 - fromY
  const endScale = 18 / size

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={active.id}
        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        animate={{
          // An upward arc through a midpoint reads as a toss, not a slide.
          x: [0, dx * 0.5, dx],
          y: [0, Math.min(dy, 0) - 110, dy],
          scale: [1, 0.8, endScale],
          opacity: [1, 1, 0.2],
        }}
        transition={{ duration: 0.7, ease: [0.32, 0, 0.4, 1], times: [0, 0.5, 1] }}
        onAnimationComplete={land}
        className="fixed z-[200] pointer-events-none rounded-2xl border-2 border-paper-raised bg-paper-raised bg-cover bg-center shadow-[var(--shadow-lift)]"
        style={{ top: fromY, left: fromX, width: size, height: size, backgroundImage: `url(${active.image})`, willChange: 'transform' }}
        aria-hidden="true"
      />
    </AnimatePresence>,
    document.body,
  )
}
