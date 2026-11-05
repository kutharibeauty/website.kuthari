import { auth } from './server'
import type { AdminPermissions } from '@/types/admin.types'
import type { AuthMetadata } from '@/types'

/**
 * Route-handler guard: returns a Response to short-circuit with (401/403) when
 * the caller isn't a signed-in admin/super_admin, or `null` when access is OK.
 *
 *   const denied = await requireAdmin(); if (denied) return denied
 */
export async function requireAdmin(): Promise<Response | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (sessionClaims?.publicMetadata as AuthMetadata | undefined)?.role
  if (role !== 'super_admin' && role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/**
 * Route-handler guard for staff permissions (Admin profiles → permissions).
 * A super admin always passes; an admin passes when their active profile has
 * ANY of the given permissions. Returns a 401/403 Response, or null when OK.
 *
 * The sidebar already hides what an admin can't use; this is the server-side
 * check that makes the permission real.
 */
export async function requirePermission(...perms: (keyof AdminPermissions)[]): Promise<Response | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role === 'super_admin') return null
  if (meta?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { createAdminClient } = await import('@/lib/supabase/server')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const q = db.from('admin_profiles').select('permissions, is_active')
  const { data } = await (meta.admin_profile_id ? q.eq('id', meta.admin_profile_id) : q.eq('user_id', userId)).maybeSingle()
  const granted = data?.is_active !== false && perms.some((p) => (data?.permissions as Partial<AdminPermissions> | null)?.[p] === true)
  return granted ? null : Response.json({ error: 'You do not have permission to do this.' }, { status: 403 })
}
