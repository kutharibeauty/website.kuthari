import { createClient, hasStaffCookie } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'

/**
 * Clerk-shaped auth() shim over Supabase Auth, so the many API routes that
 * used to destructure `const { userId, sessionClaims } = await auth()` keep
 * working unchanged. Role/profile linkage is read from the Supabase user's
 * app_metadata (set at account-link time — see otp/verify route), which
 * rides in the JWT the same way Clerk's publicMetadata did.
 *
 * The role reported here is the role FOR THIS REQUEST'S PORTAL, not a fixed
 * property of the person. Someone who is both an admin and a shopper is a
 * single auth user, so the portal is decided by which cookie carried the
 * session — see `resolveUser`. This is the single choke point every caller
 * goes through, so getting it right here fixes authorization everywhere.
 */
export async function auth(): Promise<{
  userId: string | null
  sessionClaims: { publicMetadata: AuthMetadata } | null
}> {
  const resolved = await resolveUser()
  if (!resolved) return { userId: null, sessionClaims: null }

  const { user, viaStaffCookie } = resolved
  const meta = (user.app_metadata ?? {}) as Partial<AuthMetadata>

  return {
    userId: user.id,
    sessionClaims: {
      publicMetadata: {
        // A store-cookie session is the shop, full stop — an admin browsing the
        // storefront acts as a customer there. `role` is only consulted as a
        // fallback for staff accounts created before `staff_role` existed.
        role: viaStaffCookie ? (meta.staff_role ?? meta.role ?? 'customer') : 'customer',
        supabase_profile_id: meta.supabase_profile_id ?? user.id,
        // Staff-only linkage: never hand it to a storefront session.
        admin_profile_id: viaStaffCookie ? meta.admin_profile_id : undefined,
        staff_role: meta.staff_role,
        has_customer_account: meta.has_customer_account,
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
 *
 * Returns which cookie won, because that is what decides the acting role.
 */
async function resolveUser(): Promise<{
  user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user']>
  viaStaffCookie: boolean
} | null> {
  if (await hasStaffCookie()) {
    const staff = await createClient({ staff: true })
    const { data: { user: staffUser } } = await staff.auth.getUser()
    if (staffUser) return { user: staffUser, viaStaffCookie: true }
  }
  const store = await createClient()
  const { data: { user } } = await store.auth.getUser()
  return user ? { user, viaStaffCookie: false } : null
}

export async function currentUser() {
  const resolved = await resolveUser()
  return resolved?.user ?? null
}
