export type { Database } from './database.types'

export type StaffRole = 'super_admin' | 'admin' | 'delivery'

/**
 * Rides in the Supabase user's app_metadata (see the otp/verify route).
 *
 * One phone number is one auth user, even when that person is BOTH staff and a
 * shopper. So the two portals' roles are stored in separate fields: signing in
 * to the shop must never overwrite someone's staff role, and vice versa. The
 * effective role for a request is derived from which cookie the session came
 * from — staff cookie or store cookie — not from a single mutable field. See
 * `resolveUser` in lib/auth/server.ts.
 */
export interface AuthMetadata {
  /**
   * Legacy/effective role. Still written so existing sessions and any
   * unmigrated staff account keep working, but `staff_role` is authoritative
   * for staff and a store-cookie session is always treated as 'customer'.
   */
  role: 'customer' | StaffRole
  supabase_profile_id: string
  admin_profile_id?: string
  /** Set on staff sign-in only. Survives a customer sign-in on the same phone. */
  staff_role?: StaffRole
  /** Set once this phone has a customer profile. Survives a staff sign-in. */
  has_customer_account?: boolean
}