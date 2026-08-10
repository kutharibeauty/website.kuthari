import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pincode = searchParams.get('pincode')?.trim()

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return Response.json({ error: 'Invalid pincode' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('serviceable_pincodes')
    .select('pincode, area_name, city, state')
    .eq('pincode', pincode)
    .eq('is_active', true)
    .maybeSingle()

  const row = data as unknown as {
    pincode: string; area_name: string | null; city: string | null; state: string | null
  } | null

  if (!row) {
    return Response.json({ serviceable: false })
  }

  return Response.json({
    serviceable: true,
    area: row.area_name,
    city: row.city,
    state: row.state,
  })
}
