'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  /** Terms to cycle through, e.g. category names. */
  terms: string[]
  /** Milliseconds each term stays before sliding to the next. */
  interval?: number
}

/**
 * A slide-up animated placeholder that sits over an (empty) search input.
 * Renders `Search "<term>"`, cycling through `terms` with a blink/slide-up
 * motion. Must be placed inside a `position: relative` wrapper and paired with
 * an input whose native placeholder is removed while this is shown.
 */
export default function AnimatedSearchPlaceholder({ terms, interval = 2000 }: Props) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (terms.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % terms.length)
    }, interval)
    return () => clearInterval(id)
  }, [terms.length, interval])

  if (terms.length === 0) return null

  return (
    <span
      className="absolute left-11 top-1/2 -translate-y-1/2 flex items-center text-sm font-medium text-on-surface-variant/80 pointer-events-none select-none"
      aria-hidden="true"
    >
      <span className="mr-1">Search</span>
      <span className="relative inline-block h-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={terms[index]}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="block leading-5 whitespace-nowrap text-on-surface-variant/80"
          >
            &ldquo;{terms[index]}&rdquo;
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  )
}
