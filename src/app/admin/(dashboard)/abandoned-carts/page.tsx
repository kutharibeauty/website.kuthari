import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import AbandonedCartsClient from './AbandonedCartsClient'

export const metadata: Metadata = { title: 'Abandoned Carts | Kuthari Admin' }
export const dynamic = 'force-dynamic'

export interface AbandonedCart {
  id: string
  user_id: string
  customer_name: string | null
  phone: string | null
  items: { name: string; quantity: number; price: number; unit: string }[]
  total_value: number
  item_count: number
  is_recovered: boolean
  last_activity: string
  created_at: string
}

export default async function AbandonedCartsPage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('abandoned_carts')
    .select('*')
    .order('last_activity', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]

  // The live table stores cart_items (not items) and has no customer_name —
  // join profiles to show who abandoned each cart.
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, name').in('id', userIds)
    : { data: [] }
  const nameById = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((profiles ?? []) as any[]).map((p) => [p.id, p.name]),
  )

  const carts = rows.map((c) => ({
    ...c,
    items: Array.isArray(c.cart_items) ? c.cart_items : [],
    customer_name: nameById[c.user_id] ?? c.customer_name ?? null,
  })) as AbandonedCart[]

  // ── Customer shopping lists (purchase-intent signal, shown with carts) ──
  const { data: listRows, error: listErr } = await db
    .from('shopping_lists')
    .select('user_id, items, updated_at')
    .order('updated_at', { ascending: false })

  type SLItem = { id: string; text: string; done: boolean }
  const lists = (listErr ? [] : (listRows ?? []))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((l: any) => Array.isArray(l.items) && l.items.length > 0) as Array<{ user_id: string; items: SLItem[]; updated_at: string }>

  const listUserIds = [...new Set(lists.map((l) => l.user_id).filter(Boolean))]
  const { data: listProfiles } = listUserIds.length
    ? await db.from('profiles').select('id, name, phone').in('id', listUserIds)
    : { data: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profById: Record<string, { name: string | null; phone: string | null }> = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((listProfiles ?? []) as any[]).map((p) => [p.id, { name: p.name, phone: p.phone }]),
  )

  return (
    <>
      <AbandonedCartsClient initialCarts={carts} />

      {lists.length > 0 && (
        <section className="px-4 md:px-8 max-w-7xl mx-auto w-full pb-12">
          <h2 className="text-xl md:text-2xl font-black text-primary tracking-tight capitalize mb-1">Customer Shopping Lists</h2>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mb-5">
            Notes customers saved of what they plan to order
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((l) => {
              const prof = profById[l.user_id]
              return (
                <div key={l.user_id} className="rounded-2xl border-2 border-table-border bg-surface-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="font-black text-sm text-primary truncate">{prof?.name ?? 'Customer'}</p>
                      {prof?.phone && <p className="text-xs font-medium text-on-surface-variant">{prof.phone}</p>}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 flex-shrink-0">
                      {new Date(l.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {l.items.map((it, idx) => (
                      <li key={idx} className={cn('flex items-center gap-2 text-sm font-medium', it.done ? 'text-on-surface-variant/40 line-through' : 'text-on-surface')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', it.done ? 'bg-on-surface-variant/30' : 'bg-primary')} />
                        {it.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
