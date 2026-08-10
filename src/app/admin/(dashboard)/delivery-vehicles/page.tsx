import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import DeliveryVehiclesClient from './DeliveryVehiclesClient'
import type { DeliveryVehicle } from '@/types/database.types'

export const metadata: Metadata = { title: 'Delivery Vehicles | Kuthari Admin' }
export const revalidate = 0

export default async function DeliveryVehiclesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  // Returns { data: null } if migration 034 hasn't run yet — the page still
  // renders (empty) instead of crashing.
  const { data } = await supabase
    .from('delivery_vehicles')
    .select('*')
    .order('display_order')
    .order('created_at')

  return <DeliveryVehiclesClient initial={(data ?? []) as DeliveryVehicle[]} />
}
