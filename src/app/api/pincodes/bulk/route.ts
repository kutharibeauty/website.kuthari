import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guard'

interface IncomingRow {
  pincode?: string
  area_name?: string | null
  city?: string
  state?: string
  delivery_days?: number | string
}

// POST — bulk CSV import of serviceable pincodes.
// Body: { rows: IncomingRow[] } → returns { inserted: Row[] }.
export async function POST(request: Request) {
  const denied = await requireAdmin(); if (denied) return denied

  const body = await request.json().catch(() => null) as { rows?: IncomingRow[] } | null
  const rows = body?.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'No rows provided' }, { status: 400 })
  }

  const clean = rows
    .filter((r) => typeof r.pincode === 'string' && /^\d{6}$/.test(r.pincode) && !!r.city)
    .map((r) => ({
      pincode: r.pincode as string,
      area_name: r.area_name || null,
      city: r.city as string,
      state: r.state || 'Odisha',
      delivery_days: Number(r.delivery_days) || 2,
      is_active: true,
    }))

  if (clean.length === 0) {
    return Response.json({ error: 'No valid rows. Expected columns: pincode,area_name,city,state,delivery_days' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // Upsert on the unique pincode so re-importing updates instead of erroring.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('serviceable_pincodes')
    .upsert(clean, { onConflict: 'pincode' })
    .select()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ inserted: data ?? [] }, { status: 201 })
}
