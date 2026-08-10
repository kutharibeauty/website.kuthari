'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient, createStaffClient } from '@/lib/supabase/client'
import { isSafeInternalPath } from '@/lib/validators'
import { Loader2 } from 'lucide-react'

// This page is the landing spot for implicit-flow magic links
// (#access_token=...). It must be a PUBLIC route (see proxy.ts) — the
// middleware can't see URL fragments, so redirecting straight to a
// protected page (e.g. /orders) would bounce the user back to /login
// before this client component ever runs and establishes the session.
export const dynamic = 'force-dynamic'

/**
 * Only ever redirect to an internal path.
 *
 * `next` comes straight from the query string and this page is public, so an
 * attacker can link to /auth/callback?next=https://evil.example directly —
 * bypassing the server route's check — and our trusted domain forwards the
 * visitor to their page. That's an open redirect: a standard phishing
 * amplifier, and the kind of thing that gets a site flagged for social
 * engineering. Reuses the same validator the server callback uses, which also
 * rejects absolute URLs, protocol-relative "//evil.com", backslash tricks and
 * "javascript:" payloads.
 */
function safeNext(raw: string | null): string {
  return isSafeInternalPath(raw) ? raw : '/'
}

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const next = safeNext(searchParams.get('next'))
    // Establish the session in the portal-appropriate cookie so the staff and
    // store sessions remain fully independent.
    const onStaffPath = next.startsWith('/admin') || next.startsWith('/delivery')
    const supabase = onStaffPath ? createStaffClient() : createClient()

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const finish = () => {
      if (cancelled) return
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      window.location.href = next
    }

    const run = async () => {
      const { data: { session: existing } } = await supabase.auth.getSession()
      if (existing) { finish(); return }

      const hash = window.location.hash
      if (hash && (hash.includes('access_token=') || hash.includes('refresh_token='))) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token })
          if (setErr) {
            setError('Login link expired or already used. Please request a new OTP.')
            return
          }
          finish()
          return
        }
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) finish()
      })

      timeoutId = setTimeout(() => {
        subscription.unsubscribe()
        if (!cancelled) setError('Login link expired or already used. Please request a new OTP.')
      }, 6000)
    }

    run()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-sm font-medium text-error">{error}</p>
        <a href="/login" className="text-xs font-black uppercase tracking-widest text-primary hover:underline">
          Back to Login
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <Loader2 size={24} className="animate-spin text-primary" />
      <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Securing your session…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  )
}
