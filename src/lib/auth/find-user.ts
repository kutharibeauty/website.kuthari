import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Orphan recovery: finds an existing auth.users row by phone when the
 * corresponding profiles/admin_profiles row is missing or not yet linked.
 */
export async function findAuthUserIdByPhone(
  admin: SupabaseClient,
  digits: string,
): Promise<string | null> {
  const targets = new Set([digits, `91${digits}`])
  // Staff auth users use this synthetic email; match on it too, so recovery
  // still works if the phone field is stored in an unexpected format.
  const internalEmail = `${digits}@bcrtraders.internal`.toLowerCase()
  const perPage = 1000

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) break

    for (const u of data.users) {
      const stored = (u.phone || '').replace(/\D/g, '')
      if (stored && targets.has(stored)) return u.id
      if ((u.email || '').toLowerCase() === internalEmail) return u.id
    }

    if (data.users.length < perPage) break
  }

  return null
}
