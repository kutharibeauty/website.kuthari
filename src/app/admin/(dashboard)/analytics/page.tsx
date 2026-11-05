import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { ChartCard, Kpi, RankList, StatusBreakdown, TrendChart } from '@/components/admin/charts'
import { inr } from '@/lib/format'
import type { OrderStatus, OrderItem } from '@/types/database.types'
import { formatCompactINR, cn } from '@/lib/utils'
import { addDays, dayLabel, istDayKey, istDayStart, istMonthKey, istMonthStart, monthLabel } from '@/lib/time-ist'

export const metadata: Metadata = { title: 'Analytics | Kuthari Admin' }
export const dynamic = 'force-dynamic'

type OrderRow = {
  id: string
  user_id: string | null
  status: OrderStatus
  total: number
  discount: number | null
  created_at: string
  items: OrderItem[] | null
  coupon_code: string | null
  is_bulk: boolean | null
  payment_status: string | null
}

const RANGES = {
  '7d': { label: '7 days', days: 7 },
  '30d': { label: '30 days', days: 30 },
  '90d': { label: '90 days', days: 90 },
  '12m': { label: '12 months', days: 365 },
} as const
type RangeKey = keyof typeof RANGES

const isSale = (o: { status: OrderStatus }) => o.status !== 'cancelled' && o.status !== 'returned'

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rawRange } = await searchParams
  const range: RangeKey = rawRange && rawRange in RANGES ? (rawRange as RangeKey) : '30d'
  const monthly = range === '12m'

  // Period boundaries in India time. 12 months starts on the 1st of the month.
  const end = new Date()
  const start = monthly ? istMonthStart(addDays(istMonthStart(), -330)) : addDays(istDayStart(), -(RANGES[range].days - 1))
  const span = end.getTime() - start.getTime()
  const prevStart = new Date(start.getTime() - span)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const [ordersRes, firstOrdersRes, productsRes, categoriesRes, unserviceableRes] = await Promise.all([
    db.from('orders')
      .select('id, user_id, status, total, discount, created_at, items, coupon_code, is_bulk, payment_status')
      .gte('created_at', prevStart.toISOString()),
    // Every customer's first order, to tell new customers from returning ones.
    db.from('orders').select('user_id, created_at').order('created_at', { ascending: true }),
    db.from('products').select('id, name, category_id'),
    db.from('categories').select('id, name'),
    db.from('unserviceable_attempts').select('pincode, city, created_at').gte('created_at', start.toISOString()),
  ])

  const all = (ordersRes.data ?? []) as OrderRow[]
  const cur = all.filter((o) => new Date(o.created_at) >= start)
  const prev = all.filter((o) => new Date(o.created_at) < start)
  const curSales = cur.filter(isSale)
  const prevSales = prev.filter(isSale)

  const revenue = (l: OrderRow[]) => l.reduce((s, o) => s + Number(o.total ?? 0), 0)
  const change = (a: number, b: number) => (b > 0 ? (a - b) / b : null)
  const rev = revenue(curSales)
  const prevRev = revenue(prevSales)
  const aov = curSales.length ? rev / curSales.length : 0
  const prevAov = prevSales.length ? prevRev / prevSales.length : 0

  // New vs returning: a customer is new in the period if their first ever order falls in it.
  const firstOrder = new Map<string, string>()
  for (const r of (firstOrdersRes.data ?? []) as { user_id: string | null; created_at: string }[]) {
    if (r.user_id && !firstOrder.has(r.user_id)) firstOrder.set(r.user_id, r.created_at)
  }
  const buyers = new Set(curSales.map((o) => o.user_id).filter(Boolean) as string[])
  const prevBuyers = new Set(prevSales.map((o) => o.user_id).filter(Boolean) as string[])
  const newBuyers = [...buyers].filter((u) => new Date(firstOrder.get(u) ?? 0) >= start).length
  const returningBuyers = buyers.size - newBuyers
  const everBuyers = firstOrder.size
  const orderCountByUser = new Map<string, number>()
  for (const r of (firstOrdersRes.data ?? []) as { user_id: string | null }[]) {
    if (r.user_id) orderCountByUser.set(r.user_id, (orderCountByUser.get(r.user_id) ?? 0) + 1)
  }
  const repeatRate = everBuyers ? [...orderCountByUser.values()].filter((c) => c > 1).length / everBuyers : 0

  // Trend: by IST day, or by IST month for 12 months.
  const keys: string[] = []
  if (monthly) {
    for (let d = new Date(start); d < end; d = istMonthStart(addDays(d, 32))) keys.push(istMonthKey(d))
  } else {
    for (let i = 0; i < RANGES[range].days; i++) keys.push(istDayKey(addDays(start, i)))
  }
  const bucket = new Map(keys.map((k) => [k, { revenue: 0, orders: 0 }]))
  for (const o of curSales) {
    const b = bucket.get(monthly ? istMonthKey(o.created_at) : istDayKey(o.created_at))
    if (!b) continue
    b.orders += 1
    b.revenue += Number(o.total ?? 0)
  }
  const trend = keys.map((k) => ({ label: monthly ? monthLabel(k) : dayLabel(k), ...bucket.get(k)! }))

  const statusCounts: Record<string, number> = {}
  for (const o of cur) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1

  // Products and categories from order lines.
  const productName = new Map<string, { name: string; category_id: string | null }>()
  for (const p of (productsRes.data ?? []) as { id: string; name: string; category_id: string | null }[]) productName.set(p.id, p)
  const catName = new Map<string, string>()
  for (const c of (categoriesRes.data ?? []) as { id: string; name: string }[]) catName.set(c.id, c.name)
  const prod: Record<string, { label: string; value: number; units: number }> = {}
  const cat: Record<string, number> = {}
  for (const o of curSales) {
    for (const it of o.items ?? []) {
      if (!it?.product_id) continue
      const line = Number(it.price ?? 0) * Number(it.quantity ?? 0)
      const p = (prod[it.product_id] ??= { label: productName.get(it.product_id)?.name ?? it.name ?? 'Product', value: 0, units: 0 })
      p.value += line
      p.units += Number(it.quantity ?? 0)
      const cid = productName.get(it.product_id)?.category_id
      const cname = (cid && catName.get(cid)) || 'Uncategorised'
      cat[cname] = (cat[cname] ?? 0) + line
    }
  }
  const topProducts = Object.entries(prod)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 10)
    .map(([id, r]) => ({ label: r.label, value: r.value, note: `${r.units} sold`, href: `/admin/products/${id}` }))
  const topCategories = Object.entries(cat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }))

  // Coupons used in the period, from the orders themselves.
  const coupon: Record<string, { uses: number; discount: number }> = {}
  for (const o of curSales) {
    if (!o.coupon_code) continue
    const c = (coupon[o.coupon_code] ??= { uses: 0, discount: 0 })
    c.uses += 1
    c.discount += Number(o.discount ?? 0)
  }
  const coupons = Object.entries(coupon)
    .sort((a, b) => b[1].uses - a[1].uses)
    .slice(0, 8)
    .map(([code, c]) => ({ label: code, value: c.uses, note: `${inr(c.discount)} off` }))

  const bulkShare = curSales.length ? curSales.filter((o) => o.is_bulk).length / curSales.length : 0
  const collected = curSales.filter((o) => o.payment_status === 'collected')
  const unpaid = curSales.filter((o) => o.payment_status !== 'collected')

  // Where people tried to order but we don't deliver yet.
  const pin: Record<string, { count: number; city: string | null }> = {}
  for (const a of (unserviceableRes.data ?? []) as { pincode: string | null; city: string | null }[]) {
    if (!a.pincode) continue
    const r = (pin[a.pincode] ??= { count: 0, city: a.city })
    r.count += 1
  }
  const demand = Object.entries(pin)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([code, r]) => ({ label: r.city ? `${code}, ${r.city}` : code, value: r.count }))

  const periodWord = monthly ? 'previous 12 months' : `previous ${RANGES[range].days} days`

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary">Analytics</h1>
          <p className="mt-1 text-[15px] text-on-surface-variant">
            Cancelled and returned orders are left out of sales. Changes compare with the {periodWord}.
          </p>
        </div>
        <nav className="flex rounded-full border border-table-border bg-surface-card p-1" aria-label="Period">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={`/admin/analytics?range=${k}`}
              aria-current={k === range ? 'page' : undefined}
              className={cn(
                'rounded-full px-4 py-2 text-[14px] font-semibold transition-colors',
                k === range ? 'bg-primary text-on-primary' : 'text-primary hover:bg-surface-container',
              )}
            >
              {RANGES[k].label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 md:gap-4">
        <Kpi tone="strong" label="Sales" value={formatCompactINR(rev)} change={change(rev, prevRev)} hint={inr(rev)} />
        <Kpi label="Orders" value={String(curSales.length)} change={change(curSales.length, prevSales.length)} hint={`${cur.length - curSales.length} cancelled or returned`} />
        <Kpi label="Average order" value={inr(aov)} change={change(aov, prevAov)} />
        <Kpi label="Customers who bought" value={String(buyers.size)} change={change(buyers.size, prevBuyers.size)} hint={`${newBuyers} new, ${returningBuyers} returning`} />
      </div>

      <ChartCard title="Sales over time" sub={`Line: revenue. Bars: orders. ${monthly ? 'By month.' : 'By day.'}`}>
        <TrendChart data={trend} height={280} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top products" sub="By revenue in this period">
          <RankList rows={topProducts} empty="No products sold in this period yet." />
        </ChartCard>
        <ChartCard title="Sales by category">
          <RankList rows={topCategories} empty="No category sales in this period yet." />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Order status" sub="Every order placed in this period">
          <StatusBreakdown counts={statusCounts} />
        </ChartCard>
        <ChartCard title="Customers" sub="Who is buying">
          <dl className="grid grid-cols-2 gap-4 text-[14px]">
            {[
              ['New this period', String(newBuyers)],
              ['Returning', String(returningBuyers)],
              ['All-time customers', String(everBuyers)],
              ['Come back to buy again', `${Math.round(repeatRate * 100)}%`],
              ['Bulk orders', `${Math.round(bulkShare * 100)}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface p-3">
                <dt className="text-on-surface-variant">{k}</dt>
                <dd className="mt-1 text-[22px] font-bold tabular-nums text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </ChartCard>
        <ChartCard title="Payments" sub="Sales orders in this period">
          <dl className="grid gap-3 text-[14px]">
            <div className="flex items-center justify-between rounded-xl bg-surface p-3">
              <dt className="text-on-surface-variant">Paid online</dt>
              <dd className="font-bold tabular-nums text-primary">{collected.length} · {inr(revenue(collected))}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-surface p-3">
              <dt className="text-on-surface-variant">Not marked paid</dt>
              <dd className={cn('font-bold tabular-nums', unpaid.length ? 'text-error' : 'text-primary')}>
                {unpaid.length} · {inr(revenue(unpaid))}
              </dd>
            </div>
            <p className="text-[13px] text-on-surface-variant">
              Every checkout is prepaid, so an unpaid order usually means one created by hand. Check it in Orders.
            </p>
          </dl>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Coupons used" sub="Times used and total discount given">
          <RankList rows={coupons} format="times" empty="No coupons used in this period." />
        </ChartCard>
        <ChartCard title="Asked for delivery we don't offer" sub="Pincodes people checked that aren't serviceable yet">
          <RankList rows={demand} format="checks" empty="Nobody hit an unserviceable pincode in this period." />
        </ChartCard>
      </div>
    </div>
  )
}
