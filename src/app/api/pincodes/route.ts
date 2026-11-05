import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin, requirePermission } from '@/lib/auth/guard'

export async function GET() {
  const noPerm = await requirePermission('manage_pincodes'); if (noPerm) return noPerm
  const denied = await requireAdmin(); if (denied) return denied
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('serviceable_pincodes').select('*').order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const noPerm = await requirePermission('manage_pincodes'); if (noPerm) return noPerm
  const denied = await requireAdmin(); if (denied) return denied

  const body = await request.json()
  const { pincode, area_name, city, state, delivery_days, delivery_charge } = body

  if (!pincode || !/^\d{6}$/.test(pincode) || !city) {
    return Response.json({ error: 'pincode (6 digits) and city are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('serviceable_pincodes')
    .insert({
      pincode,
      area_name: area_name || null,
      city,
      state: state || 'Odisha',
      delivery_days: delivery_days || 2,
      // null = no rate on file (default applies); 0 = free delivery here.
      delivery_charge: delivery_charge == null || delivery_charge === '' ? null : Number(delivery_charge),
      is_active: true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
