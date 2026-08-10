import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import OrdersClient from './OrdersClient'

export const metadata: Metadata = { title: 'Orders | Kuthari Admin' }
export const revalidate = 0

export default async function OrdersPage() {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('orders')
    .select('id, order_number, status, total, created_at, address, items, payment_method')
    .order('created_at', { ascending: false })
    .limit(300)

  // The table only shows how MANY items an order has, so collapse `items` to a
  // count here. Otherwise every line (name, price, image URL…) of 300 orders is
  // serialised into the payload shipped to the browser.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = ((data ?? []) as any[]).map(({ items, ...o }) => ({
    ...o,
    item_count: Array.isArray(items) ? items.length : 0,
  }))

  return <OrdersClient initialOrders={orders} />
}
