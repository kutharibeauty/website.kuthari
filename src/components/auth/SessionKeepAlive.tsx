'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Keeps the logged-in session alive without the browser client rotating tokens.
 *
 * The browser client has autoRefreshToken disabled (see lib/supabase/client) to
 * avoid the refresh-token-reuse revocation that was force-logging users out. To
 * still keep the access token fresh — especially on idle tabs that aren't
 * navigating — we periodically hit /api/auth/keepalive, where the SERVER refreshes
 * and persists the token into the cookies, then re-read the session on the client
 * so the UI stays in sync.
 */
const PING_MS = 4 * 60 * 1000 // 4 min — safely under a typical access-token TTL

export default function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const ping = async () => {
      try {
        await fetch('/api/auth/keepalive', { cache: 'no-store' })
        if (!cancelled) await supabase.auth.getSession()
      } catch {
        /* offline / transient — the next tick retries */
      }
    }

    const timer = setInterval(ping, PING_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  return null
}
