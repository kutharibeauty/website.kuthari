import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { ChartCard, Kpi, TrendChart, StatusBreakdown, RankList } from '@/components/admin/charts'
import { inr } from '@/lib/format'
import RecentOrdersTable, { type RecentOrderRow } from './RecentOrdersTable'
import type { OrderStatus, OrderItem } from '@/types/database.types'
import { formatCompactINR } from '@/lib/utils'
import { addDays, dayLabel, istDayKey, istDayStart, istMonthStart, istTodayLong } from '@/lib/time-ist'

export const metadata: Metadata = { title: 'Dashboard | Kuthari Admin' }
// Always live: this is the page staff open to see what needs doing now.
export const dynamic = 'force-dynamic'

type OrderRow = {
  id: string
  order_number: string | null
  status: OrderStatus
  total: number
  created_at: string
  items: OrderItem[] | null
  address: { name?: string } | null
}

type StockRow = { id: string; name: string; sku: string | null; images: string[] | null; stock_qty: number; low_stock_threshold: number | null }

const countsAsSale = (o: { status: OrderStatus }) => o.status !== 'cancelled' && o.status !== 'returned'

export default async function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  const todayStart = istDayStart()
  const yesterdayStart = addDays(todayStart, -1)
  const monthStart = istMonthStart()
  // Same days of last month, for a fair month-to-date comparison.
  const lastMonthStart = istMonthStart(addDays(monthStart, -1))
  const now = new Date()
  const elapsed = now.getTime() - monthStart.getTime()
  const lastMonthSamePoint = new Date(lastMonthStart.getTime() + elapsed)
  const windowStart = addDays(todayStart, -29)
  const fetchFrom = lastMonthStart < windowStart ? lastMonthStart : windowStart

  const [ordersRes, recentRes, toConfirmRes, toConfirmCount, productsRes, reviewsRes, cartsRes] = await Promise.all([
    db.from('orders').select('id, order_number, status, total, created_at, items, address').gte('created_at', fetchFrom.toISOString()),
    db.from('orders').select('id, order_number, status, total, created_at, address, items').order('created_at', { ascending: false }).limit(10),
    db.from('orders').select('id, order_number, total, created_at, address').eq('status', 'placed').order('created_at', { ascending: true }).limit(5),
    db.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'placed'),
    db.from('products').select('id, name, sku, images, stock_qty, low_stock_threshold, is_active').eq('is_active', true),
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    db.from('abandoned_carts').select('id', { count: 'exact', head: true }).gte('updated_at', addDays(todayStart, -7).toISOString()),
  ])

  const orders = (ordersRes.data ?? []) as OrderRow[]
  const recentOrders = (recentRes.data ?? []) as RecentOrderRow[]
  const toConfirm = (toConfirmRes.data ?? []) as Pick<OrderRow, 'id' | 'order_number' | 'total' | 'created_at' | 'address'>[]
  const products = (productsRes.data ?? []) as StockRow[]
  const pendingReviews = reviewsRes.count ?? 0
  const recentCarts = cartsRes.count ?? 0

  const inRange = (o: OrderRow, from: Date, to?: Date) => {
    const t = new Date(o.created_at).getTime()
    return t >= from.getTime() && (!to || t < to.getTime())
  }
  const sum = (list: OrderRow[]) => list.filter(countsAsSale).reduce((s, o) => s + Number(o.total ?? 0), 0)

  const today = orders.filter((o) => inRange(o, todayStart))
  const yesterday = orders.filter((o) => inRange(o, yesterdayStart, todayStart))
  const month = orders.filter((o) => inRange(o, monthStart))
  const lastMonthToDate = orders.filter((o) => inRange(o, lastMonthStart, lastMonthSamePoint))

  const change = (now: number, before: number) => (before > 0 ? (now - before) / before : null)

  // Low stock uses each product's own threshold (Products → stock settings).
  const lowStock = products
    .filter((p) => p.stock_qty <= (p.low_stock_threshold ?? 10))
    .sort((a, b) => a.stock_qty - b.stock_qty)

  // Last 30 IST days.
  const days = Array.from({ length: 30 }, (_, i) => istDayKey(addDays(windowStart, i)))
  const byDay = new Map(days.map((k) => [k, { revenue: 0, orders: 0 }]))
  for (const o of orders) {
    const bucket = byDay.get(istDayKey(o.created_at))
    if (!bucket || !countsAsSale(o)) continue
    bucket.orders += 1
    bucket.revenue += Number(o.total ?? 0)
  }
  const trend = days.map((k) => ({ label: dayLabel(k), ...byDay.get(k)! }))

  const last30 = orders.filter((o) => inRange(o, windowStart))
  const statusCounts: Record<string, number> = {}
  for (const o of last30) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1

  // Best sellers, last 30 days.
  const sold: Record<string, { label: string; value: number; units: number }> = {}
  for (const o of last30.filter(countsAsSale)) {
    for (const it of o.items ?? []) {
      if (!it?.product_id) continue
      const row = (sold[it.product_id] ??= { label: it.name ?? 'Product', value: 0, units: 0 })
      row.value += Number(it.price ?? 0) * Number(it.quantity ?? 0)
      row.units += Number(it.quantity ?? 0)
    }
  }
  const best = Object.entries(sold)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 5)
    .map(([id, r]) => ({ label: r.label, value: r.value, note: `${r.units} sold`, href: `/admin/products/${id}` }))

  const toConfirmTotal = toConfirmCount.count ?? 0
  const needsAttention = toConfirmTotal + lowStock.length + pendingReviews

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary">Today</h1>
          <p className="mt-1 text-[15px] text-on-surface-variant">{istTodayLong()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products/new" className="btn-pill !py-2.5 !px-4 text-[14px]">Add product</Link>
          <Link href="/admin/coupons/new" className="btn-pill !py-2.5 !px-4 text-[14px] !bg-transparent !text-primary border border-table-border hover:!border-primary">New coupon</Link>
          <Link href="/" target="_blank" className="btn-pill !py-2.5 !px-4 text-[14px] !bg-transparent !text-primary border border-table-border hover:!border-primary">View store</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 md:gap-4">
        <Kpi
          tone="strong"
          label="Sales today"
          value={inr(sum(today))}
          change={change(sum(today), sum(yesterday))}
          hint={`${today.filter(countsAsSale).length} orders, vs yesterday`}
        />
        <Kpi
          tone={toConfirmTotal > 0 ? 'alert' : 'plain'}
          label="Orders to confirm"
          value={String(toConfirmTotal)}
          hint={toConfirmTotal > 0 ? 'Waiting for you' : 'All caught up'}
          href="/admin/orders?status=placed"
        />
        <Kpi
          label="Sales this month"
          value={formatCompactINR(sum(month))}
          change={change(sum(month), sum(lastMonthToDate))}
          hint="vs same days last month"
        />
        <Kpi
          tone={lowStock.length > 0 ? 'alert' : 'plain'}
          label="Low on stock"
          value={String(lowStock.length)}
          hint={`of ${products.length} live products`}
          href="#low-stock"
        />
      </div>

      {needsAttention > 0 && (
        <ChartCard title="Needs your attention" sub="Clear these first">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="text-[15px] font-semibold text-primary">Orders to confirm ({toConfirmTotal})</h3>
              {toConfirm.length ? (
                <ul className="mt-3 space-y-2">
                  {toConfirm.map((o) => (
                    <li key={o.id}>
                      <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-table-border px-3 py-2.5 text-[14px] hover:border-primary/40">
                        <span className="min-w-0">
                          <span className="block font-semibold text-primary truncate">{o.order_number ?? `#${o.id.slice(0, 8)}`}</span>
                          <span className="block text-on-surface-variant truncate">{o.address?.name ?? 'Customer'}</span>
                        </span>
                        <span className="tabular-nums font-semibold text-primary">{inr(Number(o.total))}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[14px] text-on-surface-variant">None waiting.</p>
              )}
            </div>
            <div id="low-stock">
              <h3 className="text-[15px] font-semibold text-primary">Low on stock ({lowStock.length})</h3>
              {lowStock.length ? (
                <ul className="mt-3 space-y-2">
                  {lowStock.slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 rounded-xl border border-table-border px-3 py-2 text-[14px] hover:border-primary/40">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="h-9 w-9 shrink-0 rounded-lg bg-surface-container" />
                        )}
                        <span className="min-w-0 flex-1 truncate font-semibold text-primary capitalize">{p.name}</span>
                        <span className={p.stock_qty === 0 ? 'font-semibold text-error' : 'font-semibold text-primary'}>
                          {p.stock_qty === 0 ? 'Out' : `${p.stock_qty} left`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[14px] text-on-surface-variant">Everything is stocked.</p>
              )}
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-primary">Also waiting</h3>
              <ul className="mt-3 space-y-2 text-[14px]">
                <li className="flex items-center justify-between rounded-xl border border-table-border px-3 py-2.5">
                  <span className="text-primary">Reviews to approve</span>
                  <span className="font-semibold tabular-nums text-primary">{pendingReviews}</span>
                </li>
                <li>
                  <Link href="/admin/abandoned-carts" className="flex items-center justify-between rounded-xl border border-table-border px-3 py-2.5 hover:border-primary/40">
                    <span className="text-primary">Carts left this week</span>
                    <span className="font-semibold tabular-nums text-primary">{recentCarts}</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </ChartCard>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Sales, last 30 days" sub="Line: revenue. Bars: orders. Cancelled orders left out." className="lg:col-span-2">
          <TrendChart data={trend} />
        </ChartCard>
        <ChartCard title="Order status" sub="Last 30 days">
          <StatusBreakdown counts={statusCounts} />
        </ChartCard>
      </div>

      <ChartCard
        title="Best sellers"
        sub="Last 30 days, by revenue"
        action={<Link href="/admin/analytics" className="text-[14px] font-semibold text-secondary hover:underline">Full report</Link>}
      >
        <RankList rows={best} empty="Best sellers show up here after your first orders." />
      </ChartCard>

      <RecentOrdersTable initialOrders={recentOrders} />
    </div>
  )
}
