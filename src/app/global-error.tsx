'use client'

import { useEffect } from 'react'
import './globals.css'

/**
 * Last-resort error UI.
 *
 * `error.tsx` only wraps the segments BELOW the root layout, so an error thrown
 * in the root layout itself — or anywhere the segment boundary can't catch,
 * such as `generateMetadata` — escapes it entirely. Without this file Next
 * falls back to its own unbranded "Application error" page, which is exactly
 * what production served for every /product/* URL while the footer's cookie
 * read was failing those renders with DYNAMIC_SERVER_USAGE.
 *
 * This replaces the root layout when active, so it has to bring its own <html>,
 * <body> and stylesheet. next/font is NOT applied here — the font variables
 * live on the real root layout's <html> — so the type stack is declared
 * explicitly rather than relying on `font-heading`/`font-sans`.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack ?? null,
        digest: error.digest ?? null,
        scope: 'global-error',
      }),
    }).catch(() => {})
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#FAF6EE', color: '#1B2C3D' }}>
        <title>Something went wrong | Kuthari Beauty Store</title>

        <main
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem 1.5rem',
            fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#B9862F',
            }}
          >
            Kuthari Beauty Store
          </span>

          <span
            aria-hidden
            style={{
              display: 'block',
              width: 96,
              height: 1,
              margin: '1.25rem 0 1.75rem',
              background: 'linear-gradient(to right, transparent, #B9862F, transparent)',
            }}
          />

          <h1
            style={{
              fontFamily: "'Playfair Display', ui-serif, Georgia, serif",
              fontSize: 'clamp(1.9rem, 5vw, 3rem)',
              fontWeight: 600,
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              maxWidth: '34rem',
              margin: '1rem 0 0',
              fontSize: '0.95rem',
              lineHeight: 1.7,
              color: 'rgba(27, 44, 61, 0.7)',
            }}
          >
            The page could not be loaded. This is on our side, not yours — please try
            again, and if it keeps happening give us a call and we&apos;ll help you order.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
              marginTop: '2rem',
            }}
          >
            <button
              onClick={() => unstable_retry()}
              style={{
                padding: '0.85rem 1.75rem',
                borderRadius: 9999,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: '#1B2C3D',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '0.85rem 1.75rem',
                borderRadius: 9999,
                border: '1.5px solid rgba(27, 44, 61, 0.25)',
                color: '#1B2C3D',
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Go home
            </a>
            <a
              href="tel:+919861235276"
              style={{
                padding: '0.85rem 1.75rem',
                borderRadius: 9999,
                border: '1.5px solid rgba(27, 44, 61, 0.25)',
                color: '#1B2C3D',
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Call us
            </a>
          </div>

          {/* Matches the `digest` in the server logs — the only way to tie a
              customer's report to the actual stack trace. */}
          {error.digest && (
            <p style={{ marginTop: '2.5rem', fontSize: 11, color: 'rgba(27, 44, 61, 0.4)' }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  )
}
