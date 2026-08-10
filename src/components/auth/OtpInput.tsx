'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'

interface Props {
  value: string
  onChange: (val: string) => void
  length?: number
  autoFocus?: boolean
  /** Called when all boxes are filled (e.g. to auto-submit). */
  onComplete?: (val: string) => void
  /** Bump this (e.g. a counter) to play a shake — used to signal a wrong OTP. */
  shakeSignal?: number
}

/**
 * OTP input rendered as segmented boxes but backed by a SINGLE hidden
 * `autocomplete="one-time-code"` field. A single field is what makes OS/keyboard
 * SMS auto-fill (iOS + Android Gboard) and the Web OTP API actually populate the
 * whole code — segmented boxes with `maxLength={1}` truncate the autofill to one
 * digit, so the code "arrives but doesn't fill". Paste and typing flow through
 * the same field, and the value is fully controlled so programmatic fills work.
 */
export default function OtpInput({ value, onChange, length = 4, autoFocus, onComplete, shakeSignal }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const shakeControls = useAnimation()

  useEffect(() => {
    if (!shakeSignal) return
    shakeControls.start({ x: [0, -9, 8, -7, 6, -3, 0], transition: { duration: 0.45, ease: 'easeOut' } })
  }, [shakeSignal, shakeControls])

  const digits = Array.from({ length }, (_, i) => value[i] ?? '')
  const activeIndex = Math.min(value.length, length - 1)

  // Keep the caret pinned to the end of the value. The boxes are transparent, so
  // caret position is invisible — but it still governs where a typed digit lands
  // and whether Backspace has anything before it to delete. When the field is
  // re-focused while already full (e.g. after a wrong-OTP error moved focus to
  // the submit button), browsers often drop the caret at position 0, which makes
  // Backspace appear "broken". Forcing it to the end fixes both problems.
  const caretToEnd = () => {
    const el = inputRef.current
    if (!el) return
    requestAnimationFrame(() => {
      try { el.setSelectionRange(el.value.length, el.value.length) } catch {}
    })
  }

  const commit = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
  }

  // Delete from the end regardless of caret position, so editing/correcting a
  // wrong code always works even if the browser parked the caret at the start.
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      if (value.length > 0) onChange(value.slice(0, -1))
      caretToEnd()
    }
  }

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      {/* The real, single input — receives SMS auto-fill / paste / typing. */}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { commit(e.target.value); caretToEnd() }}
        onKeyDown={handleKeyDown}
        onFocus={() => { setFocused(true); caretToEnd() }}
        onClick={caretToEnd}
        onBlur={() => setFocused(false)}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        aria-label="One-time code"
        className="absolute inset-0 z-10 h-full w-full cursor-pointer text-transparent bg-transparent caret-transparent outline-none opacity-0"
      />

      {/* Visual segmented boxes (mirror the input value). */}
      <motion.div animate={shakeControls} className="flex items-center justify-between gap-2.5 sm:gap-3">
        {digits.map((d, i) => {
          const isActive = focused && i === activeIndex
          return (
            <div
              key={i}
              className={`relative flex w-full aspect-square min-w-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-surface-card text-2xl font-black text-primary transition-all duration-200 ${
                d ? 'border-primary/60' : 'border-table-border'
              } ${isActive ? 'border-primary shadow-[0_0_0_4px_rgba(27, 44, 61,0.08)] -translate-y-0.5' : ''}`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {d ? (
                  <motion.span
                    key={`${i}-${d}`}
                    initial={{ scale: 0.4, opacity: 0, y: 6 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  >
                    {d}
                  </motion.span>
                ) : isActive ? (
                  <motion.span
                    key="caret"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-6 w-0.5 animate-pulse rounded-full bg-primary"
                  />
                ) : null}
              </AnimatePresence>
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}
