import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import DeliveryPersonsClient from './DeliveryPersonsClient'

export const metadata: Metadata = { title: 'Delivery Persons | Kuthari Admin' }

type DeliveryPerson = {
  id: string
  name: string
  phone: string
  user_id: string
  role: string
  created_at: string
}

export default async function DeliveryPersonsPage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from('admin_profiles')
    .select('id, name, phone, user_id, role, created_at')
    .eq('role', 'delivery')
    .order('created_at', { ascending: false })

  const persons: DeliveryPerson[] = (data ?? []) as DeliveryPerson[]

  return <DeliveryPersonsClient initialPersons={persons} />
}
