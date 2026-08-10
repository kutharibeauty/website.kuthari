import { createClient } from '@/lib/supabase/server'

/**
 * Look up a destination pincode.
 *
 * Delivery is all-India, so EVERY valid 6-digit pincode is serviceable — this
 * endpoint no longer gates ordering. Its job is to return the delivery charge
 * for that pincode (and any area/city labels the admin has on file).
 *
 * `delivery_charge` is null when the admin hasn't set a rate for this pincode;
 * the caller then applies DEFAULT_PINCODE_DELIVERY_FEE. An explicit 0 is a real
 * rate meaning free delivery there, so it must not be collapsed into null.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pincode = searchParams.get('pincode')?.trim()

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return Response.json({ error: 'Invalid pincode' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('serviceable_pincodes')
    .select('pincode, area_name, city, state, delivery_charge')
    .eq('pincode', pincode)
    .eq('is_active', true)
    .maybeSingle()

  const row = data as unknown as {
    pincode: string
    area_name: string | null
    city: string | null
    state: string | null
    delivery_charge: number | null
  } | null

  return Response.json({
    // Always true — kept in the payload so existing callers keep working.
    serviceable: true,
    area: row?.area_name ?? null,
    city: row?.city ?? null,
    state: row?.state ?? null,
    delivery_charge: row?.delivery_charge ?? null,
  })
}
