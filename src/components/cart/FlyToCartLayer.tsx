'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useFlyToCartStore } from '@/store/flyToCartStore'

/** The header renders a desktop AND a mobile cart icon, only one of which is
 *  actually visible at a time (the other is `display:none`, so its rect
 *  collapses to zero). Picks whichever one is really on screen right now. */
function getCartTargetRect(): DOMRect | null {
  const els = document.querySelectorAll<HTMLElement>('[data-cart-target]')
  for (const el of Array.from(els)) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return rect
  }
  return null
}

interface ActiveFlight {
  id: string
  image: string
  from: DOMRect
  to: DOMRect
}

/**
 * Mounted once near the app root. Renders a cloned product thumbnail that
 * arcs from wherever "Add" was clicked to the header cart icon, then fades
 * into it — purely a visual flourish layered on top of the existing cart
 * store; it never reads or writes cart state itself.
 */
export default function FlyToCartLayer() {
  const flight = useFlyToCartStore((s) => s.flight)
  const clear = useFlyToCartStore((s) => s.clear)
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<ActiveFlight | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!flight) return
    const to = getCartTargetRect()
    // No visible cart icon to land on (e.g. mid-layout-shift) — skip quietly.
    if (to) setActive({ id: flight.id, image: flight.image, from: flight.fromRect, to })
    clear()
  }, [flight, clear])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {active && (
        <motion.div
          key={active.id}
          initial={{
            top: active.from.top,
            left: active.from.left,
            width: active.from.width,
            height: active.from.height,
            opacity: 1,
            scale: 1,
            borderRadius: 14,
          }}
          animate={{
            // A gentle upward arc (dip through a midpoint above the straight
            // line) reads as a "toss" rather than a slide.
            top: [active.from.top, active.from.top - 90, active.to.top + active.to.height / 2 - 9],
            left: [
              active.from.left,
              (active.from.left + active.to.left) / 2,
              active.to.left + active.to.width / 2 - 9,
            ],
            width: [active.from.width, active.from.width * 0.6, 18],
            height: [active.from.height, active.from.height * 0.6, 18],
            opacity: [1, 1, 0],
            scale: [1, 1, 0.4],
            borderRadius: [14, 14, 999],
          }}
          transition={{ duration: 0.72, ease: [0.32, 0, 0.4, 1], times: [0, 0.55, 1] }}
          onAnimationComplete={() => setActive(null)}
          className="fixed z-[200] pointer-events-none border-2 border-white bg-white bg-cover bg-center shadow-xl"
          style={{ backgroundImage: `url(${active.image})` }}
        />
      )}
    </AnimatePresence>,
    document.body,
  )
}
