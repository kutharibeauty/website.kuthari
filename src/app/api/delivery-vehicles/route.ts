import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guard'
import { NextRequest } from 'next/server'

/**
 * GET  — active lorries for the checkout dropdown (any signed-in user; the proxy
 *        already requires a session). `?admin=true` returns ALL, admin-gated.
 * POST — create a vehicle/bus (admin only).
 */
export async function GET(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  if (req.nextUrl.searchParams.get('admin') === 'true') {
    const denied = await requireAdmin(); if (denied) return denied
    const { data, error } = await supabase
      .from('delivery_vehicles').select('*').order('display_order').order('created_at')
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  const { data, error } = await supabase
    .from('delivery_vehicles')
    .select('id, number, name, phone')
    .eq('is_active', true)
    .order('display_order')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const denied = await requireAdmin(); if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const number = String(body.number ?? '').trim()
  if (!number) return Response.json({ error: 'Vehicle number is required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('delivery_vehicles')
    .insert({
      number,
      name: String(body.name ?? '').trim() || null,
      phone: String(body.phone ?? '').trim() || null,
      is_active: body.is_active !== false,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
