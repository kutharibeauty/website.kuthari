import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import OrderDetailClient from './OrderDetailClient'
import type { Order } from '@/types/database.types'

export const metadata: Metadata = { title: 'Order Detail | Kuthari Admin' }
export const revalidate = 0

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const [orderRes, deliveryRes, issueRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('orders').select('*').eq('id', id).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('admin_profiles')
      .select('id, name, phone')
      .eq('role', 'delivery')
      .eq('is_active', true)
      .order('name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('order_issues').select('id, status, reason').eq('order_id', id).maybeSingle(),
  ])

  if (!orderRes.data) notFound()

  return (
    <OrderDetailClient
      order={orderRes.data as unknown as Order & { notes: string | null }}
      deliveryPersons={deliveryRes.data ?? []}
      issue={issueRes.data ?? null}
    />
  )
}
