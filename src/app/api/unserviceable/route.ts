import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import type { AuthMetadata } from '@/types'
import type { OrderItem } from '@/types/database.types'

export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('unserviceable_attempts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, phone, pincode, city, state, cart_items, cart_value, user_id } = body

  if (!pincode) return Response.json({ error: 'pincode is required' }, { status: 400 })

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // The client (header pincode check) usually only sends the pincode. If the
  // visitor is signed in, enrich the attempt with their profile + live cart so
  // admins can follow up — anonymous visitors are still recorded.
  let resolvedUserId: string | null = user_id ?? null
  let resolvedName: string | null = name ?? null
  let resolvedPhone: string = phone ?? ''
  let resolvedCart: unknown = cart_items ?? null
  let resolvedCartValue: number | null = cart_value ?? null

  try {
    const { userId, sessionClaims } = await auth()
    if (userId) {
      const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
      const profileId = meta?.supabase_profile_id ?? userId
      resolvedUserId = resolvedUserId ?? profileId

      const { data: profile } = await db.from('profiles').select('name, phone').eq('id', profileId).maybeSingle()
      if (profile) {
        if (!resolvedName) resolvedName = profile.name ?? null
        if (!resolvedPhone) resolvedPhone = profile.phone ?? ''
      }

      // Pull their current cart for context if the client didn't send one.
      if (!resolvedCart) {
        const { data: cart } = await db
          .from('abandoned_carts')
          .select('cart_items, total_value')
          .eq('user_id', profileId)
          .order('last_activity', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cart) {
          resolvedCart = cart.cart_items ?? null
          resolvedCartValue = resolvedCartValue ?? cart.total_value ?? null
        }
      }
    }
  } catch {
    /* not signed in — record anonymously */
  }

  const { data, error } = await db
    .from('unserviceable_attempts')
    .insert({
      user_id: resolvedUserId,
      name: resolvedName,
      phone: resolvedPhone,
      pincode,
      city: city ?? null,
      state: state ?? null,
      cart_snapshot: resolvedCart,
      admin_notified: false,
      admin_contacted: false,
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const insertedId = (data as { id: string }).id

  // Notify admins after the response — `after()` keeps the function alive so the
  // alert reliably sends instead of being dropped when the response returns.
  after(() => notifyAdmins(insertedId, resolvedName, resolvedPhone, pincode, city ?? null, resolvedCart as OrderItem[] | null, resolvedCartValue))

  return Response.json({ id: insertedId }, { status: 201 })
}

async function notifyAdmins(
  id: string,
  customerName: string | null,
  phone: string,
  pincode: string,
  city: string | null,
  cartItems: OrderItem[] | null,
  cartValue: number | null,
) {
  try {
    const resend = await import('@/lib/resend')
    const admins = await resend.getOrderEmailAdmins()

    await resend.sendUnserviceableAlert(
      { id, customerName, phone, pincode, city, cartItems, cartValue },
      admins,
    )

    // Mark admin_notified = true
    const { createAdminClient: getAdmin } = await import('@/lib/supabase/server')
    const supabase = getAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('unserviceable_attempts')
      .update({ admin_notified: true })
      .eq('id', id)
  } catch (e) {
    console.error('Unserviceable alert email error:', e)
  }
}
