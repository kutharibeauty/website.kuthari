import type { Metadata } from 'next'
import PincodesClient from './PincodesClient'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Pincodes | Kuthari Admin' }
export const dynamic = 'force-dynamic'

export interface PincodeRow {
  id: string
  pincode: string
  area_name: string | null
  city: string
  state: string
  delivery_days: number
  /** Admin-set delivery charge for this pincode. null = use the default rate. */
  delivery_charge: number | null
  is_active: boolean
  created_at: string
}

export default async function PincodesPage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('serviceable_pincodes')
    .select('*')
    .order('created_at', { ascending: false })

  return <PincodesClient initialRows={(data ?? []) as PincodeRow[]} />
}
