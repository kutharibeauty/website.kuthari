'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, Home, Phone } from 'lucide-react'

/**
 * Segment error boundary for everything under the root layout. Errors in the
 * root layout itself (or in `generateMetadata`) escape this and are caught by
 * `global-error.tsx` instead.
 */
export default function Error({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string }
  // Next 16 renamed the recovery prop to `unstable_retry`, which re-fetches as
  // well as re-renders; `reset` only re-renders and is kept as a fallback so a
  // future rename can't leave the button dead.
  unstable_retry?: () => void
  reset?: () => void
}) {
  const retry = unstable_retry ?? reset

  useEffect(() => {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack ?? null,
        digest: error.digest ?? null,
      }),
    }).catch(() => {})
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-20">
      <span className="eyebrow">Kuthari Beauty Store</span>
      <div className="rule-gold w-24 mt-4 mb-7" />

      <h1 className="display text-3xl md:text-5xl">Something went wrong</h1>

      <p className="mt-4 max-w-lg text-sm md:text-base leading-relaxed text-on-surface-variant/75">
        This page could not be loaded. It&apos;s on our side, not yours — please try
        again, and if it keeps happening give us a call and we&apos;ll help you place
        your order.
      </p>

      <div className="mt-9 flex flex-wrap gap-3 justify-center">
        {retry && (
          <button
            onClick={() => retry()}
            className="press gold-sheen relative overflow-hidden flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-white text-[11px] font-bold uppercase tracking-[0.14em] hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={14} strokeWidth={2.5} /> Try again
          </button>
        )}
        <Link
          href="/"
          className="press flex items-center gap-2 px-7 py-3.5 rounded-full border-[1.5px] border-table-border text-primary text-[11px] font-bold uppercase tracking-[0.14em] hover:border-primary transition-colors"
        >
          <Home size={14} strokeWidth={2.5} /> Go home
        </Link>
        <a
          href="tel:+919861235276"
          className="press flex items-center gap-2 px-7 py-3.5 rounded-full border-[1.5px] border-table-border text-primary text-[11px] font-bold uppercase tracking-[0.14em] hover:border-primary transition-colors"
        >
          <Phone size={14} strokeWidth={2.5} /> Call us
        </a>
      </div>

      {/* Matches the `digest` in the server logs — the only way to tie a
          customer's report to the actual stack trace. */}
      {error.digest && (
        <p className="mt-10 text-[11px] tracking-wide text-on-surface-variant/40">
          Reference: {error.digest}
        </p>
      )}
    </div>
  )
}
