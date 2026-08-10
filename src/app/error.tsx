'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log client-side errors to server
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
            <AlertTriangle size={32} className="text-error" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-headline-md text-headline-md text-on-surface">Something went wrong</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="font-label-sm text-label-sm text-on-surface-variant/60">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full font-label-sm text-label-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={14} /> Try Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-5 py-2.5 border-[1.5px] border-outline-variant text-on-surface-variant rounded-full font-label-sm text-label-sm hover:bg-surface-container transition-colors"
          >
            <Home size={14} /> Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
