'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, createStaffClient } from '@/lib/supabase/client'

/**
 * Fallback for magic links that resolve to implicit-flow hash tokens
 * (#access_token=...) instead of a PKCE `?code=` — the normal path is
 * handled server-side by /api/auth/callback. Also drains any pending
 * profile data (name/email) stashed before the OTP-verify redirect.
 */
export default function AuthTokenCatcher() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash || (!hash.includes('access_token=') && !hash.includes('refresh_token='))) return

    // Land the session in the correct cookie for whichever portal this page
    // belongs to, so store and staff sessions stay independent.
    const onStaffPath =
      window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/delivery')
    const supabase = onStaffPath ? createStaffClient() : createClient()

    const handleHash = async () => {
      try {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (!access_token || !refresh_token) return

        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) throw error

        window.history.replaceState(null, '', window.location.pathname + window.location.search)

        try {
          const raw = sessionStorage.getItem('bcr_pending_profile')
          if (raw) {
            const pending = JSON.parse(raw)
            if (pending?.ts && Date.now() - pending.ts < 10 * 60 * 1000) {
              await fetch('/api/auth/save-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: pending.name, ...(pending.email ? { email: pending.email } : {}) }),
              }).catch(() => {})
            }
            sessionStorage.removeItem('bcr_pending_profile')
          }
        } catch {}

        router.refresh()
      } catch (err) {
        console.error('AuthTokenCatcher error:', err)
      }
    }

    handleHash()
  }, [router])

  return null
}
