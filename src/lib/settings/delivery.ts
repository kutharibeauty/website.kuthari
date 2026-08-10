import { createAdminClient } from '@/lib/supabase/server'

/**
 * Whether the delivery-person portal (/delivery) and its APIs are enabled.
 * Controlled from Admin → Settings and stored in cms_content 'settings'.
 * Defaults to FALSE — the delivery panel stays off until an admin turns it on,
 * without any code being removed.
 */
export async function isDeliveryEnabled(): Promise<boolean> {
  try {
    const db = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from('cms_content')
      .select('value')
      .eq('key', 'settings')
      .maybeSingle()
    const v = (data?.value ?? null) as { delivery_enabled?: boolean } | null
    return v?.delivery_enabled === true
  } catch {
    return false
  }
}
