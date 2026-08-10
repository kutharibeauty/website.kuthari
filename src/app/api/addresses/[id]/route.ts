import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

async function getProfileId(): Promise<string | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return null
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  return meta?.supabase_profile_id ?? userId
}

// DELETE /api/addresses/[id] — remove one of the caller's own saved addresses.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profileId = await getProfileId()
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('addresses').delete().eq('id', id).eq('user_id', profileId)
  if (error) return NextResponse.json({ error: 'Could not delete address' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/addresses/[id] — edit one of the caller's own saved addresses, or
// (with only { is_default: true }) mark it as the default. Both flows first
// confirm the address belongs to the caller, then apply the change server-side.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profileId = await getProfileId()
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = (await req.json().catch(() => ({}))) as {
    name?: string; phone?: string; line1?: string; line2?: string | null
    city?: string; state?: string; pincode?: string; label?: string | null; is_default?: boolean
  }
  const db = createAdminClient()

  // Confirm the address belongs to the caller before touching anything.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: own } = await (db as any).from('addresses').select('id').eq('id', id).eq('user_id', profileId).maybeSingle()
  if (!own) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

  // A field edit is any change beyond flipping the default flag.
  const isFieldEdit =
    body.name !== undefined || body.phone !== undefined || body.line1 !== undefined ||
    body.line2 !== undefined || body.city !== undefined || body.state !== undefined ||
    body.pincode !== undefined || body.label !== undefined

  if (isFieldEdit) {
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

    // Only one default per customer.
    if (body.is_default === true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from('addresses').update({ is_default: false }).eq('user_id', profileId)
    }

    const { data, error } = await (db as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('addresses')
      .update({
        name,
        phone,
        line1,
        line2: body.line2?.trim() || null,
        city,
        state,
        pincode,
        label: body.label || null,
        ...(body.is_default !== undefined ? { is_default: !!body.is_default } : {}),
      })
      .eq('id', id)
      .eq('user_id', profileId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Could not update address' }, { status: 500 })
    return NextResponse.json(data)
  }

  if (body.is_default === true) {
    // Only one default per customer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from('addresses').update({ is_default: false }).eq('user_id', profileId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', profileId)
    if (error) return NextResponse.json({ error: 'Could not update address' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
