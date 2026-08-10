import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * The states we actually deliver to, read from the `serviceable_pincodes`
 * allow-list.
 *
 * Delivery is NOT nationwide — an order is only accepted for a pincode present
 * (and active) in that table. So the Product JSON-LD must not claim shipping to
 * all of India; `shippingDestination` carries these states alongside the country
 * code. Returns [] when the list is empty or the query fails, in which case the
 * caller falls back to the country alone.
 *
 * `cache()` dedupes the query across one render pass (the product page renders
 * many of these during a static build).
 */
export const getServiceableRegions = cache(async (): Promise<string[]> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('serviceable_pincodes')
      .select('state')
      .eq('is_active', true)

    if (error || !data) return []

    const states = (data as Array<{ state: string | null }>)
      .map((r) => r.state?.trim())
      .filter((s): s is string => !!s)

    return [...new Set(states)].sort()
  } catch {
    return []
  }
})
