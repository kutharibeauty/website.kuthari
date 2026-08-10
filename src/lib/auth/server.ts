import { createClient, hasStaffCookie } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'

/**
 * Clerk-shaped auth() shim over Supabase Auth, so the many API routes that
 * used to destructure `const { userId, sessionClaims } = await auth()` keep
 * working unchanged. Role/profile linkage is read from the Supabase user's
 * app_metadata (set at account-link time — see otp/verify route), which
 * rides in the JWT the same way Clerk's publicMetadata did.
 */
export async function auth(): Promise<{
  userId: string | null
  sessionClaims: { publicMetadata: AuthMetadata } | null
}> {
  const user = await resolveUser()
  if (!user) return { userId: null, sessionClaims: null }

  const meta = (user.app_metadata ?? {}) as Partial<AuthMetadata>
  return {
    userId: user.id,
    sessionClaims: {
      publicMetadata: {
        role: meta.role ?? 'customer',
        supabase_profile_id: meta.supabase_profile_id ?? user.id,
        admin_profile_id: meta.admin_profile_id,
      },
    },
  }
}

/**
 * The staff (admin/delivery) and store (customer) sessions live in separate
 * cookies. Prefer the staff session when its cookie is present — an admin's
 * /api/* calls carry both cookies — and fall back to the store session. Skip
 * the staff lookup entirely for plain customers (no staff cookie) so their
 * requests still make a single getUser() call.
 */
async function resolveUser() {
  if (await hasStaffCookie()) {
    const staff = await createClient({ staff: true })
    const { data: { user: staffUser } } = await staff.auth.getUser()
    if (staffUser) return staffUser
  }
  const store = await createClient()
  const { data: { user } } = await store.auth.getUser()
  return user
}

export async function currentUser() {
  return resolveUser()
}
