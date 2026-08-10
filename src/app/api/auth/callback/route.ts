import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isSafeInternalPath } from '@/lib/validators'
import { STAFF_COOKIE_NAME, isStaffPath } from '@/lib/supabase/cookie-scope'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Establishes a Supabase cookie session after phone-OTP verification, then
 * redirects to `next`. Handles, in order of preference:
 *   1. `token_hash` — from generateLink in /api/auth/otp/verify (primary path;
 *      verified server-side, so the session lands in cookies with no Supabase
 *      round-trip or URL-fragment loss).
 *   2. `code` — PKCE magic-link exchange (legacy / other flows).
 *   3. neither — implicit-flow fragment link; hand off to the client
 *      /auth/callback page which reads the `#access_token` fragment.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = (requestUrl.searchParams.get('type') ?? 'magiclink') as EmailOtpType
  const requestedNext = requestUrl.searchParams.get('next') ?? '/'
  const next = isSafeInternalPath(requestedNext) ? requestedNext : '/'

  const cookieStore = await cookies()

  // A staff login (next → /admin or /delivery) lands the session in the SEPARATE
  // staff cookie, so it's independent of the store (customer) session.
  const staff = isStaffPath(next)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // called from a Server Component context — safe to ignore
          }
        },
      },
      ...(staff ? { cookieOptions: { name: STAFF_COOKIE_NAME } } : {}),
    },
  )

  // 1. Primary path — token_hash from our OTP-verify step.
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (error) {
      console.error('[auth/callback] verifyOtp(token_hash) failed:', error.message)
      return NextResponse.redirect(new URL('/login?error=session_failed', requestUrl.origin))
    }
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // 2. PKCE `?code=` exchange.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] Code exchange failed:', error.message)
      return NextResponse.redirect(new URL('/login?error=session_failed', requestUrl.origin))
    }
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // 3. Implicit-flow fragment — client page reads it and sets the session.
  return NextResponse.redirect(new URL(`/auth/callback?next=${encodeURIComponent(next)}`, requestUrl.origin))
}
