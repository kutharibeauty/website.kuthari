import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import DeliveryAssignmentsClient from './DeliveryAssignmentsClient'
import type { OrderStatus } from '@/types/database.types'

export const metadata: Metadata = { title: 'Delivery Assignments | Kuthari Admin' }
export const revalidate = 30

type AssignmentOrder = {
  id: string
  status: OrderStatus
  total: number
  created_at: string
  address: {
    name: string
    phone: string
    line1: string
    city: string
    state: string
    pincode: string
  } | null
  items: { name: string; quantity: number }[] | null
}

type DeliveryPerson = {
  id: string
  name: string
  phone: string
}

export default async function DeliveryAssignmentsPage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: ordersData }, { data: personsData }] = await Promise.all([
    db
      .from('orders')
      .select('id, status, total, created_at, address, items')
      .in('status', ['confirmed', 'packed', 'shipping'])
      .order('created_at', { ascending: true }),
    db
      .from('admin_profiles')
      .select('id, name, phone')
      .eq('role', 'delivery')
      .order('name'),
  ])

  const orders: AssignmentOrder[] = (ordersData ?? []) as AssignmentOrder[]
  const persons: DeliveryPerson[] = (personsData ?? []) as DeliveryPerson[]

  return <DeliveryAssignmentsClient orders={orders} persons={persons} />
}
