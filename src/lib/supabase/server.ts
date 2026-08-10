import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { STAFF_COOKIE_NAME } from './cookie-scope'

/**
 * Request-scoped server client. `staff: true` binds it to the separate STAFF
 * cookie (admin/delivery) instead of the default store cookie, so the two
 * portals hold independent sessions.
 */
export async function createClient(opts?: { staff?: boolean }) {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
      ...(opts?.staff ? { cookieOptions: { name: STAFF_COOKIE_NAME } } : {}),
    }
  )
}

/** True when a staff session cookie is present on this request (cheap check). */
export async function hasStaffCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.getAll().some((c) => c.name === STAFF_COOKIE_NAME || c.name.startsWith(`${STAFF_COOKIE_NAME}.`))
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
