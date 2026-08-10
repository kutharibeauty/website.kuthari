'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition, useRef, useEffect, useState } from 'react'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { Search, X } from 'lucide-react'
import AnimatedSearchPlaceholder from '@/components/layout/AnimatedSearchPlaceholder'
import type { Category } from '@/types/database.types'

interface Props {
  categories: Category[]
  initialQ: string
  initialCategory: string
  hideCategoriesOnDesktop?: boolean
}

/** Fallback rotating terms when no category names are available. */
const DEFAULT_TERMS = ['sugar', 'atta', 'edible oil', 'pulses', 'spices', 'water']

export default function SearchControls({ categories, initialQ, initialCategory, hideCategoriesOnDesktop }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const [hasValue, setHasValue] = useState(!!initialQ)

  const terms = categories.length > 0 ? categories.map((c) => c.name) : DEFAULT_TERMS

  useEffect(() => {
    // Sync the box to the URL query, but never while the user is typing in it —
    // the debounced navigation below lands a moment after each keystroke, and
    // overwriting a focused input would drop characters typed during that gap.
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = initialQ
    }
    setHasValue(!!initialQ)
  }, [initialQ])

  const push = useCallback(
    (q: string, cat: string) => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (cat) params.set('category', cat)
      startTransition(() => {
        router.push(`/search?${params.toString()}`, { scroll: false })
      })
    },
    [router]
  )

  // Hold the query navigation back until the user pauses typing, so we fetch
  // once per pause instead of once per keystroke. The placeholder toggle stays
  // instant; only the network request is debounced.
  const debouncedPush = useDebouncedCallback(push, 350)

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value)
      debouncedPush(e.target.value, searchParams.get('category') ?? '')
    },
    [debouncedPush, searchParams]
  )

  const clearQ = () => {
    if (inputRef.current) inputRef.current.value = ''
    setHasValue(false)
    push('', searchParams.get('category') ?? '')
    inputRef.current?.focus()
  }

  const selectCat = (slug: string) => {
    push(searchParams.get('q') ?? '', slug === initialCategory ? '' : slug)
  }

  return (
    <div className="space-y-4">
      {/* ── Search bar ── */}
      <div className="relative group">
        <Search
          size={17}
          className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${isPending ? 'text-primary' : 'text-on-surface-variant/50 group-focus-within:text-primary'
            }`}
        />
        <input
          ref={inputRef}
          type="search"
          defaultValue={initialQ}
          onChange={handleInput}
          placeholder=""
          className="w-full pl-11 pr-10 py-3.5 bg-surface-card border-2 border-table-border rounded-2xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-all duration-200 shadow-sm focus:shadow-[0_0_0_4px_rgba(0,0,0,0.06)]"
        />
        {/* Animated rotating placeholder — only while empty */}
        {!hasValue && <AnimatedSearchPlaceholder terms={terms} />}
        {/* Clear button */}
        {initialQ && (
          <button
            onClick={clearQ}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-on-surface/8 hover:bg-on-surface/15 text-on-surface-variant hover:text-primary transition-all duration-150 active:scale-90"
            aria-label="Clear search"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
        {/* Loading spinner */}
        {isPending && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        )}
      </div>

      {/* ── Category filter chips — hidden on desktop when sidebar handles filtering ── */}
      {categories.length > 0 && (
        <div className={`flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 ${hideCategoriesOnDesktop ? 'lg:hidden' : ''}`}>
          {/* All chip */}
          <button
            onClick={() => selectCat('')}
            className={`flex-shrink-0 text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-xl border-2 transition-all duration-200 active:scale-95 ${!initialCategory
                ? 'bg-primary text-on-primary border-primary shadow-sm'
                : 'bg-surface-card border-table-border text-on-surface-variant hover:border-primary/50 hover:text-primary'
              }`}
          >
            All
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => selectCat(cat.slug)}
              className={`flex-shrink-0 text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-xl border-2 transition-all duration-200 active:scale-95 whitespace-nowrap ${initialCategory === cat.slug
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-surface-card border-table-border text-on-surface-variant hover:border-primary/50 hover:text-primary'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
