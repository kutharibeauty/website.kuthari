import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { normalizeIndianPhone } from '@/lib/validators'
import { DEFAULT_PERMISSIONS } from '@/types/admin.types'
import type { AuthMetadata } from '@/types'
import type { AdminPermissions } from '@/types/admin.types'

async function requireManageAdminProfiles(): Promise<Response | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role === 'super_admin') return null

  if (meta?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Regular admin: must have manage_admin_profiles permission
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('permissions')
    .eq('user_id', userId)
    .maybeSingle()

  const perms = (profile as unknown as { permissions: AdminPermissions } | null)?.permissions
  if (!perms?.manage_admin_profiles) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function GET() {
  const authError = await requireManageAdminProfiles()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const authError = await requireManageAdminProfiles()
  if (authError) return authError

  const body = await request.json()
  const { name, phone, email, role, permissions } = body

  if (!name || !phone || !role) {
    return Response.json({ error: 'name, phone, and role are required' }, { status: 400 })
  }

  if (!['admin', 'delivery'].includes(role)) {
    return Response.json({ error: 'Role must be admin or delivery' }, { status: 400 })
  }

  // Store the phone in the SAME canonical shape login looks it up by (+91XXXXXXXXXX).
  // Previously the raw typed value ("+91 90400 11053", "9040011053", …) was saved,
  // so the OTP login lookup never matched — staff were stuck "Pending" and got
  // "no staff account found" when trying to log in.
  const digits = normalizeIndianPhone(phone)
  if (!digits) {
    return Response.json({ error: 'Enter a valid 10-digit mobile number.' }, { status: 400 })
  }
  const cleanPhone = `+91${digits}`

  const supabase = createAdminClient()
  const resolvedPerms = role === 'delivery' ? {} : (permissions ?? DEFAULT_PERMISSIONS)

  // Look up any existing profile for this number in either legacy (10-digit) or
  // canonical (+91…) shape. `.in()` encodes the "+" correctly (unlike a raw
  // `.or()` filter string); active rows come first so a live duplicate wins.
  const { data: matches } = await supabase
    .from('admin_profiles')
    .select('id, is_active')
    .in('phone', [cleanPhone, digits])
    .order('is_active', { ascending: false })
    .limit(1)

  const existing = (matches as { id: string; is_active: boolean }[] | null)?.[0]

  if (existing) {
    if (existing.is_active) {
      return Response.json({ error: 'A staff profile with this phone number already exists.' }, { status: 409 })
    }
    // A previously-removed (soft-deleted) profile — reactivate & refresh it
    // instead of failing on the unique constraint.
    const { data: revived, error: reviveErr } = await supabase
      .from('admin_profiles')
      .update({
        name: String(name).trim(),
        phone: cleanPhone,
        email: email || null,
        role,
        permissions: resolvedPerms,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (reviveErr) return Response.json({ error: reviveErr.message }, { status: 500 })
    return Response.json(revived, { status: 200 })
  }

  const { data, error } = await supabase
    .from('admin_profiles')
    .insert({
      name: String(name).trim(),
      phone: cleanPhone,
      email: email || null,
      role,
      permissions: resolvedPerms,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    // Final safety net: any unique-violation that slipped past the check above
    // becomes a friendly 409 instead of the raw Postgres constraint message.
    if (error.code === '23505' || /duplicate key|admin_profiles_phone_key/i.test(error.message)) {
      return Response.json({ error: 'A staff profile with this phone number already exists.' }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}
