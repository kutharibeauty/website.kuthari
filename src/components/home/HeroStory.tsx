'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Pause, Play, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { useT } from '@/hooks/useT'
import { retailOption } from '@/lib/products/packaging'
import Logo from '@/components/layout/Logo'
import type { Product } from '@/types/database.types'

const HOLD_MS = 5200
/** Each story sits on its own ground, cycling through the palette. */
const GROUNDS = ['bg-periwinkle', 'bg-lilac', 'bg-paper-sunk', 'bg-haze']

/**
 * The hero's signature: real products from the shelf, played like a story.
 * Bars fill across the top, a tap on either half steps back or forward, and
 * the pause button holds it. Under reduced motion it starts paused.
 */
export default function HeroStory({ products }: { products: Product[] }) {
  const { tField } = useT()
  const stories = products.slice(0, 4)
  const [index, setIndex] = useState(0)
  // Starts paused for people who ask for reduced motion; the button overrides.
  const reduceMotion = useReducedMotion()
  const [userPaused, setUserPaused] = useState<boolean | null>(null)
  const paused = userPaused ?? !!reduceMotion
  const setPaused = (fn: (v: boolean) => boolean) => setUserPaused(fn(paused))


  const go = useCallback(
    (step: number) => setIndex((i) => (i + step + stories.length) % stories.length),
    [stories.length],
  )

  if (!stories.length) {
    return (
      <div className="relative h-full min-h-[420px] rounded-[var(--radius-panel)] bg-periwinkle flex items-center justify-center">
        <Logo className="h-48 w-auto" sizes="140px" />
      </div>
    )
  }

  const p = stories[index]
  const name = tField(p.name, p.name_or)
  const unit = tField(p.unit, p.unit_or)
  const retail = retailOption(p)
  const price = retail?.price ?? p.price

  return (
    <div
      className="relative h-full min-h-[440px] lg:min-h-0 rounded-[var(--radius-panel)] overflow-hidden select-none"
      aria-roledescription="carousel"
      aria-label="From the shelf"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute inset-0 ${GROUNDS[index % GROUNDS.length]}`}
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${stories.length}: ${name}`}
        >
          {p.images?.[0] && (
            <Image
              src={p.images[0]}
              alt={name}
              fill
              priority={index === 0}
              sizes="(max-width: 1024px) 92vw, 640px"
              className="object-cover"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress bars + the story header. */}
      <div className="absolute inset-x-0 top-0 z-10 p-4 md:p-5 pb-8 bg-gradient-to-b from-paper-raised/95 via-paper-raised/70 to-transparent">
        <div className="flex gap-1.5">
          {stories.map((s, i) => (
            <span key={s.id} className="h-[3px] flex-1 rounded-full bg-ink/15 overflow-hidden">
              {i < index && <span className="block h-full w-full bg-ink" />}
              {i === index && (
                <span
                  key={`${s.id}-${index}`}
                  className="block h-full w-full bg-ink story-fill"
                  style={{
                    ['--story-ms' as string]: `${HOLD_MS}ms`,
                    animationPlayState: paused ? 'paused' : 'running',
                  }}
                  onAnimationEnd={() => go(1)}
                />
              )}
            </span>
          ))}
        </div>
        <div className="mt-3.5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-raised ring-2 ring-indigo">
            <Logo className="h-6 w-auto" sizes="24px" />
          </span>
          <span className="text-[15px] font-bold text-ink">kuthari</span>
          <span className="text-[14px] text-ink/70 truncate capitalize">{name}</span>
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-ink/10 text-ink hover:bg-ink/20 transition-colors"
            aria-label={paused ? 'Play the story' : 'Pause the story'}
            aria-pressed={paused}
          >
            {paused ? <Play size={15} strokeWidth={2.5} /> : <Pause size={15} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Tap zones: left half back, right half forward. */}
      {stories.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="group/prev absolute left-0 top-20 bottom-28 z-[5] w-1/2 flex items-center justify-start pl-3"
            aria-label="Previous product"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-raised/80 text-ink opacity-0 transition-opacity group-hover/prev:opacity-100 group-focus-visible/prev:opacity-100">
              <ChevronLeft size={18} />
            </span>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="group/next absolute right-0 top-20 bottom-28 z-[5] w-1/2 flex items-center justify-end pr-3"
            aria-label="Next product"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-raised/80 text-ink opacity-0 transition-opacity group-hover/next:opacity-100 group-focus-visible/next:opacity-100">
              <ChevronRight size={18} />
            </span>
          </button>
        </>
      )}

      {/* The product, ready to buy. */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-5">
        <div className="flex items-center gap-3.5 rounded-[1.25rem] bg-paper-raised p-3 pr-3.5 shadow-[var(--shadow-lift)] max-w-[440px]">
          <span className="relative h-16 w-16 shrink-0 rounded-xl bg-paper-sunk overflow-hidden">
            {p.images?.[0] && (
              <Image src={p.images[0]} alt="" fill sizes="64px" className="object-contain p-1.5 mix-blend-multiply" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-ink capitalize truncate">{name}</span>
            <span className="block text-[13px] text-muted truncate">
              {[p.brand, unit].filter(Boolean).join(', ')}
            </span>
            <span className="block text-[15px] font-bold text-ink tabular-nums">₹{price.toLocaleString('en-IN')}</span>
          </span>
          <Link href={`/product/${p.slug}`} className="btn-pill btn-pill-accent !px-4 !py-2.5 text-[14px]">
            Shop
            <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
