import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'
import type { AdminPermissions } from '@/types/admin.types'

// §1.3 / Rule #9: managing admin accounts requires super_admin, or an admin who
// actually holds the `manage_admin_profiles` permission. A plain `admin` role is
// NOT enough — otherwise any admin could edit/deactivate other admins or grant
// themselves permissions by PATCHing their own row (privilege escalation).
async function requireAdminAccess(): Promise<Response | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role === 'super_admin') return null
  if (meta?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('permissions')
    .eq('user_id', userId)
    .maybeSingle()
  const perms = (profile as unknown as { permissions: AdminPermissions } | null)?.permissions
  if (!perms?.manage_admin_profiles) return Response.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 })

  // An admin can ALWAYS read their OWN profile — that's how the panel loads the
  // permissions that decide which tabs to show. Without this a plain admin (who
  // by definition lacks manage_admin_profiles) could never read their own
  // permissions, so every tab stayed hidden even after being granted them.
  // Reading ANOTHER admin's profile still requires super_admin or the
  // manage_admin_profiles permission, so this is not a privilege escalation.
  const row = data as unknown as { user_id: string | null }
  if (meta.role !== 'super_admin' && row.user_id !== userId) {
    const { data: me } = await supabase
      .from('admin_profiles')
      .select('permissions')
      .eq('user_id', userId)
      .maybeSingle()
    const perms = (me as unknown as { permissions?: AdminPermissions } | null)?.permissions
    if (!perms?.manage_admin_profiles) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return Response.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAccess()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  const { name, email, permissions, is_active } = body

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) update.name = name
  if (email !== undefined) update.email = email || null

  // Protect super_admin from permission/status changes
  if (existing.role !== 'super_admin') {
    if (permissions !== undefined) update.permissions = permissions
    if (is_active !== undefined) update.is_active = is_active
  }

  const { data, error } = await supabase
    .from('admin_profiles')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAccess()
  if (authError) return authError

  const { id } = await params
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (existing?.role === 'super_admin') {
    return Response.json({ error: 'Super Admin cannot be deactivated' }, { status: 403 })
  }

  const { error } = await supabase
    .from('admin_profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
