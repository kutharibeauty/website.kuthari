import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import UnserviceableClient from './UnserviceableClient'

export const metadata: Metadata = { title: 'Unserviceable Attempts | Kuthari Admin' }
export const dynamic = 'force-dynamic'

export interface UnserviceableAttempt {
  id: string
  customer_name: string | null
  phone: string | null
  pincode: string
  city: string | null
  cart_value: number | null
  cart_items: { name: string; quantity: number }[] | null
  is_contacted: boolean
  notes: string | null
  created_at: string
}

// The live table stores name/admin_contacted/cart_snapshot; map them onto the
// display shape the client expects (customer_name/is_contacted/cart_items).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): UnserviceableAttempt {
  const items = Array.isArray(r.cart_snapshot) ? r.cart_snapshot : null
  const cartValue = items
    ? items.reduce((sum: number, i: { price?: number; quantity?: number }) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0)
    : null
  return {
    id: r.id,
    customer_name: r.name ?? null,
    phone: r.phone ?? null,
    pincode: r.pincode,
    city: r.city ?? null,
    cart_value: cartValue,
    cart_items: items,
    is_contacted: !!r.admin_contacted,
    notes: r.notes ?? null,
    created_at: r.created_at,
  }
}

export default async function UnserviceablePage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('unserviceable_attempts')
    .select('*')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <UnserviceableClient initialRows={((data ?? []) as any[]).map(mapRow)} />
}
