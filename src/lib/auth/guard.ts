import { auth } from './server'
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
