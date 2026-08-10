import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

/**
 * POST /api/addresses — create a delivery address for the signed-in customer.
 *
 * Done server-side (not from the browser client) so it can't fail on a stale
 * browser access token or RLS timing: the user is taken from the cookie session
 * and user_id is forced to that profile, so the write is always correct & safe.
 */
/** GET /api/addresses — list the signed-in customer's saved addresses. */
export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? userId

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('addresses')
    .select('*')
    .eq('user_id', profileId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Your session expired. Please sign in again.' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? userId

  const body = await req.json().catch(() => null) as {
    name?: string; phone?: string; line1?: string; line2?: string | null
    city?: string; state?: string; pincode?: string; label?: string | null; is_default?: boolean
  } | null
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const name = body.name?.trim()
  const phone = body.phone?.trim()
  const line1 = body.line1?.trim()
  const city = body.city?.trim()
  const state = body.state?.trim()
  const pincode = String(body.pincode ?? '').trim()

  if (!name || !phone || !line1 || !city || !state) {
    return NextResponse.json({ error: 'Please fill all required fields.' }, { status: 400 })
  }
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: 'Enter a valid 6-digit pincode.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Only one default per customer.
  if (body.is_default) {
    await db.from('addresses').update({ is_default: false }).eq('user_id', profileId)
  }

  const { data, error } = await db
    .from('addresses')
    .insert({
      user_id: profileId,
      name,
      phone,
      line1,
      line2: body.line2?.trim() || null,
      city,
      state,
      pincode,
      label: body.label || null,
      is_default: !!body.is_default,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
