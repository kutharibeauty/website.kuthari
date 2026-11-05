import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import type { Address } from '@/types/database.types'
import type { OrderIssue } from '@/lib/orders/issues'
import IssueDetailClient from './IssueDetailClient'

export const metadata: Metadata = { title: 'Damaged / wrong item | Kuthari Admin' }
export const dynamic = 'force-dynamic'

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issue } = await (db as any).from('order_issues').select('*').eq('id', id).maybeSingle()
  if (!issue) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (db as any)
    .from('orders').select('id, order_number, user_id, address, delivered_at, total, created_at').eq('id', issue.order_id).maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (db as any)
    .from('profiles').select('name, phone, email').eq('id', order?.user_id ?? '').maybeSingle()

  const address = (order?.address ?? null) as Address | null
  return (
    <IssueDetailClient
      issue={issue as OrderIssue}
      order={{
        id: order?.id ?? issue.order_id,
        orderNumber: order?.order_number ?? '—',
        deliveredAt: order?.delivered_at ?? null,
        orderedAt: order?.created_at ?? null,
      }}
      customer={{
        name: address?.name || profile?.name || 'Customer',
        phone: address?.phone || profile?.phone || '',
        email: profile?.email ?? null,
        address,
      }}
    />
  )
}
