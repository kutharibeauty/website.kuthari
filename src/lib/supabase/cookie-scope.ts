// Two independent auth sessions on the same domain, so logging out of one
// portal never touches the other:
//   • store  (customer)      → the DEFAULT Supabase cookie (sb-<ref>-auth-token),
//                              left exactly as it was so existing customer
//                              sessions keep working.
//   • staff  (admin/delivery) → a SEPARATE cookie named below.
//
// Both cookies use path "/" so the staff cookie is also sent on the /api/* calls
// the admin panel makes; the store and staff cookies never collide because they
// have different names. auth() and the proxy prefer the staff cookie when it is
// present, falling back to the store cookie.

export const STAFF_COOKIE_NAME = 'bcr-staff-auth-token'

/** Page routes served under the STAFF (admin/delivery) session. */
export function isStaffPath(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/delivery')
}
