import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guard'

type Params = { params: Promise<{ id: string }> }

// PATCH — toggle active / edit a serviceable pincode.
export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin(); if (denied) return denied
  const { id } = await params
  const body = await request.json()

  const allowed = ['is_active', 'area_name', 'city', 'state', 'delivery_days', 'pincode']
  const update: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) update[k] = body[k]
  if (!Object.keys(update).length) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('serviceable_pincodes').update(update).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

// DELETE — remove a serviceable pincode.
export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin(); if (denied) return denied
  const { id } = await params

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('serviceable_pincodes').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
