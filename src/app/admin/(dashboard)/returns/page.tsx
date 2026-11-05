import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { ISSUE_REASONS, ISSUE_RESOLUTIONS, ISSUE_STATUS_LABEL, type IssueStatus, type OrderIssue } from '@/lib/orders/issues'
import { istDateTime, STATUS_CHIP } from './format'

export const metadata: Metadata = { title: 'Damaged & wrong items | Kuthari Admin' }
export const dynamic = 'force-dynamic'

const TABS: Array<{ key: IssueStatus | 'all'; label: string }> = [
  { key: 'requested', label: 'To review' },
  { key: 'approved', label: 'To send' },
  { key: 'resolved', label: 'Sent' },
  { key: 'rejected', label: 'Not approved' },
  { key: 'all', label: 'All' },
]


type Row = OrderIssue & { orders: { order_number: string; address: { name?: string; phone?: string } | null } | null }

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'requested' } = await searchParams
  const tab = TABS.some((t) => t.key === status) ? (status as IssueStatus | 'all') : 'requested'
  const db = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any)
    .from('order_issues')
    .select('*, orders(order_number, address)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (tab !== 'all') q = q.eq('status', tab)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data }, { data: counts }] = await Promise.all([q, (db as any).from('order_issues').select('status')])
  const rows = (data ?? []) as Row[]
  const count = (k: string) => ((counts ?? []) as { status: string }[]).filter((c) => k === 'all' || c.status === k).length

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 pb-12">
      <header className="border-b-2 border-table-border pb-5">
        <h1 className="text-2xl font-bold text-primary">Damaged &amp; wrong items</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Customers report problems within 48 hours of delivery. Approve to book a replacement or exchange. No money is refunded.
        </p>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter requests">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/returns?status=${t.key}`}
            className={cn(
              'shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors',
              tab === t.key ? 'border-primary bg-primary text-white' : 'border-table-border text-primary hover:border-primary/40',
            )}
          >
            {t.label} <span className="opacity-70">{count(t.key)}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-table-border p-10 text-center text-on-surface-variant">
          Nothing here right now.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/returns/${r.id}`}
                className="flex flex-col gap-3 rounded-2xl border-2 border-table-border bg-surface-card p-4 hover:border-primary/40 transition-colors sm:flex-row sm:items-center"
              >
                <div className="flex shrink-0 gap-1.5">
                  {r.photos.slice(0, 3).map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p} src={p} alt="" className="h-14 w-14 rounded-lg object-cover bg-surface-container" />
                  ))}
                  {r.photos.length === 0 && <div className="h-14 w-14 rounded-lg bg-surface-container" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-primary">
                    {ISSUE_REASONS[r.reason]}
                    <span className="font-medium text-on-surface-variant"> · {ISSUE_RESOLUTIONS[r.resolution]}</span>
                  </p>
                  <p className="text-sm text-on-surface-variant truncate">
                    #{r.orders?.order_number ?? '—'} · {r.orders?.address?.name ?? 'Customer'} · {r.items.map((i) => i.name).join(', ')}
                  </p>
                  <p className="text-xs text-on-surface-variant/70 mt-0.5">{istDateTime(r.created_at)}</p>
                </div>
                <span className={cn('self-start shrink-0 rounded-lg border-2 px-3 py-1 text-xs font-bold sm:self-center', STATUS_CHIP[r.status])}>
                  {ISSUE_STATUS_LABEL[r.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
