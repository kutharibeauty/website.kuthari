import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import AnalyticsCharts from './AnalyticsCharts'
import type {
  MonthPoint, ProductPoint, CategoryPoint, StatusPoint,
  CouponPoint, PincodePoint, CustomerPoint, AnalyticsSummary,
  CustomerSegments,
} from './AnalyticsCharts'
import type { OrderStatus, OrderItem } from '@/types/database.types'

export const metadata: Metadata = { title: 'Analytics | Kuthari Admin' }
export const revalidate = 300 // 5-minute cache

// ── Types ──────────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string
  user_id: string
  status: OrderStatus
  total: number
  created_at: string
  items: OrderItem[] | null
  coupon_code: string | null
  is_bulk: boolean | null
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // ── Build month labels (last 12 months) ─────────────────────────────────────
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    }
  })

  const yearStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  // ── Parallel data fetch ──────────────────────────────────────────────────────
  const [
    ordersRes,       // all orders from last 12 months
    allOrdersRes,    // all orders all-time (id + user_id only, for customer analysis)
    productsRes,
    categoriesRes,
    couponsRes,
    unserviceableRes,
  ] = await Promise.all([
    db.from('orders')
      .select('id, user_id, status, total, created_at, items, coupon_code')
      .gte('created_at', yearStart.toISOString()),

    db.from('orders')
      .select('id, user_id, created_at, status, total, is_bulk'),

    db.from('products').select('id, name, category_id'),
    db.from('categories').select('id, name'),

    supabase
      .from('coupons')
      .select('code, uses_count, discount_type, discount_value')
      .gt('uses_count', 0)
      .order('uses_count', { ascending: false })
      .limit(10),

    db.from('unserviceable_attempts')
      .select('pincode, city, created_at'),
  ])

  const orders      = (ordersRes.data ?? [])    as OrderRow[]
  const allOrders   = (allOrdersRes.data ?? []) as { id: string; user_id: string; created_at: string; status: OrderStatus; total: number; is_bulk: boolean | null }[]

  // ── Product & category maps ──────────────────────────────────────────────────
  const productMap: Record<string, { name: string; category_id: string | null }> = {}
  for (const p of (productsRes.data ?? [])) {
    productMap[p.id] = { name: p.name, category_id: p.category_id }
  }
  const categoryMap: Record<string, string> = {}
  for (const c of (categoriesRes.data ?? [])) {
    categoryMap[c.id] = c.name
  }

  // ── Monthly revenue ──────────────────────────────────────────────────────────
  const monthly: MonthPoint[] = months.map(m => {
    const mo = orders.filter(o => {
      const key = o.created_at.slice(0, 7)
      return key === m.key && o.status !== 'cancelled'
    })
    const revenue = mo.reduce((s, o) => s + (o.total ?? 0), 0)
    const count   = mo.length
    return { month: m.label, revenue, orders: count, avg: count > 0 ? revenue / count : 0 }
  })

  // ── Order status breakdown (all-time) ─────────────────────────────────────────
  const STATUS_COLORS: Record<string, string> = {
    placed: '#6B7280', confirmed: '#3B82F6', packed: '#F59E0B',
    shipping: '#8B5CF6', delivered: '#0C831F', cancelled: '#ba1a1a',
  }
  const statusMap: Record<string, number> = {}
  for (const o of allOrders) {
    statusMap[o.status] = (statusMap[o.status] ?? 0) + 1
  }
  const statusBreakdown: StatusPoint[] = Object.entries(statusMap).map(([status, count]) => ({
    status, count, color: STATUS_COLORS[status] ?? '#9CA3AF',
  }))

  // ── Top products (from order items) ─────────────────────────────────────────
  const productRevMap: Record<string, { name: string; revenue: number; units: number }> = {}
  for (const order of orders) {
    if (order.status === 'cancelled') continue
    for (const item of (order.items ?? [])) {
      if (!item?.product_id) continue
      if (!productRevMap[item.product_id]) {
        productRevMap[item.product_id] = {
          name: productMap[item.product_id]?.name ?? item.name ?? item.product_id,
          revenue: 0,
          units: 0,
        }
      }
      productRevMap[item.product_id].revenue += (item.price ?? 0) * (item.quantity ?? 0)
      productRevMap[item.product_id].units   += (item.quantity ?? 0)
    }
  }
  const allProductPoints = Object.values(productRevMap)
  const topByRevenue: ProductPoint[] = [...allProductPoints]
    .sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  const topByUnits: ProductPoint[] = [...allProductPoints]
    .sort((a, b) => b.units - a.units).slice(0, 10)

  // ── Category revenue ─────────────────────────────────────────────────────────
  const catRevMap: Record<string, number> = {}
  for (const order of orders) {
    if (order.status === 'cancelled') continue
    for (const item of (order.items ?? [])) {
      if (!item?.product_id) continue
      const catId   = productMap[item.product_id]?.category_id
      const catName = catId ? (categoryMap[catId] ?? 'Other') : 'Other'
      catRevMap[catName] = (catRevMap[catName] ?? 0) + (item.price ?? 0) * (item.quantity ?? 0)
    }
  }
  const categoryRevenue: CategoryPoint[] = Object.entries(catRevMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([category, revenue]) => ({ category, revenue }))

  // ── Customer analysis ────────────────────────────────────────────────────────
  const userFirstOrder: Record<string, string> = {}
  const userOrderCount: Record<string, number> = {}
  for (const o of allOrders) {
    if (!o.user_id) continue
    userOrderCount[o.user_id] = (userOrderCount[o.user_id] ?? 0) + 1
    if (!userFirstOrder[o.user_id] || o.created_at < userFirstOrder[o.user_id]) {
      userFirstOrder[o.user_id] = o.created_at
    }
  }
  const uniqueCustomers  = Object.keys(userFirstOrder).length
  const repeatCustomers  = Object.values(userOrderCount).filter(c => c > 1).length
  const repeatRate       = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0

  const newCustomers: CustomerPoint[] = months.map(m => ({
    month: m.label,
    count: Object.values(userFirstOrder).filter(date => date.slice(0, 7) === m.key).length,
  }))

  // ── Summary ──────────────────────────────────────────────────────────────────
  const allTimeNonCancelled = allOrders.filter(o => o.status !== 'cancelled')
  const totalRevenue    = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total ?? 0), 0)
  const totalOrders     = allTimeNonCancelled.length
  const avgOrderValue   = totalOrders > 0 ? totalRevenue / Math.max(1, orders.filter(o => o.status !== 'cancelled').length) : 0

  const summary: AnalyticsSummary = {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    uniqueCustomers,
    repeatCustomers,
    repeatRate,
  }

  // ── Customer segments ────────────────────────────────────────────────────────
  const userSpend: Record<string, number> = {}
  const userIsBulk: Record<string, boolean> = {}
  for (const o of allOrders) {
    if (!o.user_id || o.status === 'cancelled') continue
    userSpend[o.user_id] = (userSpend[o.user_id] ?? 0) + (o.total ?? 0)
    if (o.is_bulk) userIsBulk[o.user_id] = true
  }
  const segments: CustomerSegments = {
    newCustomers: Object.values(userOrderCount).filter((c) => c === 1).length,
    returning:    Object.values(userOrderCount).filter((c) => c >= 2).length,
    highValue:    Object.values(userSpend).filter((s) => s > 5000).length,
    bulkBuyers:   Object.values(userIsBulk).length,
  }

  // ── Coupons ──────────────────────────────────────────────────────────────────
  const couponUsage: CouponPoint[] = (couponsRes.data ?? []).map((c: {
    code: string; uses_count: number; discount_type: string; discount_value: number
  }) => ({
    code: c.code,
    count: c.uses_count,
    type: c.discount_type,
    value: c.discount_value,
  }))

  // ── Unserviceable pincodes ────────────────────────────────────────────────────
  const pincodeMap: Record<string, { count: number; city: string | null }> = {}
  for (const a of (unserviceableRes.data ?? [])) {
    if (!a.pincode) continue
    if (!pincodeMap[a.pincode]) pincodeMap[a.pincode] = { count: 0, city: a.city ?? null }
    pincodeMap[a.pincode].count++
  }
  const pincodeHeatmap: PincodePoint[] = Object.entries(pincodeMap)
    .sort((a, b) => b[1].count - a[1].count).slice(0, 10)
    .map(([pincode, { count, city }]) => ({ pincode, count, city }))

  return (
    <AnalyticsCharts
      monthly={monthly}
      statusBreakdown={statusBreakdown}
      topByRevenue={topByRevenue}
      topByUnits={topByUnits}
      categoryRevenue={categoryRevenue}
      newCustomers={newCustomers}
      couponUsage={couponUsage}
      pincodeHeatmap={pincodeHeatmap}
      summary={summary}
      segments={segments}
    />
  )
}
