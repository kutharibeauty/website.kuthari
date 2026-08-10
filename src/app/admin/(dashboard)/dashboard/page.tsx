import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { DailyOrdersChart, CategoryRevenueChart, StatusDonutChart } from './DashboardCharts'
import RecentOrdersTable, { type RecentOrderRow } from './RecentOrdersTable'
import type { OrderStatus, OrderItem } from '@/types/database.types'
import { formatCompactINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard | Kuthari Admin' }
export const revalidate = 60

type OrderRow = {
  id: string
  status: OrderStatus
  total: number
  created_at: string
  items: OrderItem[]
}

type LowStockProduct = {
  id: string
  name: string
  sku: string | null
  images: string[]
  stock_qty: number
}

const STATUS_COLORS: Record<string, string> = {
  placed:    '#6B7280',
  confirmed: '#3B82F6',
  packed:    '#F59E0B',
  shipping:  '#8B5CF6',
  delivered: '#0C831F',
  cancelled: '#ba1a1a',
}

export default async function DashboardPage() {
  const supabase = createAdminClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const windowStart = monthStart < thirtyDaysAgo ? monthStart : thirtyDaysAgo

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [ordersRes, recentRes, activeCountRes, lowStockRes, productsRes, categoriesRes] = await Promise.all([
    db.from('orders')
      .select('id, status, total, created_at, items')
      .gte('created_at', windowStart.toISOString()),

    db.from('orders')
      .select('id, order_number, status, total, created_at, address, items')
      .order('created_at', { ascending: false })
      .limit(10),

    supabase.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    supabase.from('products')
      .select('id, name, sku, images, stock_qty')
      .eq('is_active', true)
      .lt('stock_qty', 10)
      .order('stock_qty', { ascending: true })
      .limit(8),

    supabase.from('products').select('id, category_id'),

    supabase.from('categories').select('id, name').eq('is_active', true),
  ])

  const windowOrders = (ordersRes.data ?? []) as OrderRow[]
  const recentOrders = (recentRes.data ?? []) as RecentOrderRow[]
  const activeProductCount = activeCountRes.count ?? 0
  const lowStockProducts = (lowStockRes.data ?? []) as LowStockProduct[]

  const productCategoryMap: Record<string, string | null> = {}
  for (const p of (productsRes.data ?? [])) {
    productCategoryMap[(p as { id: string; category_id: string | null }).id] =
      (p as { id: string; category_id: string | null }).category_id
  }
  const categoryNameMap: Record<string, string> = {}
  for (const c of (categoriesRes.data ?? [])) {
    categoryNameMap[(c as { id: string; name: string }).id] = (c as { id: string; name: string }).name
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const todayOrders = windowOrders.filter(o => new Date(o.created_at) >= todayStart)
  const yesterdayOrders = windowOrders.filter(o => {
    const d = new Date(o.created_at)
    return d >= yesterdayStart && d < todayStart
  })
  const pendingOrders = windowOrders.filter(o => o.status === 'placed' || o.status === 'confirmed')
  const placedCount = pendingOrders.filter(o => o.status === 'placed').length
  const confirmedCount = pendingOrders.filter(o => o.status === 'confirmed').length
  const monthOrders = windowOrders.filter(o => new Date(o.created_at) >= monthStart)
  const monthRevenue = monthOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total ?? 0), 0)
  const todayDelta = todayOrders.length - yesterdayOrders.length

  // ── 30-day daily chart ─────────────────────────────────────────────────────

  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const dayStart = new Date(thirtyDaysAgo)
    dayStart.setDate(dayStart.getDate() + i)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)
    const dayOrders = windowOrders.filter(o => {
      const d = new Date(o.created_at)
      return d >= dayStart && d <= dayEnd
    })
    return {
      day: dayStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + (o.total ?? 0), 0),
    }
  })

  // ── Category revenue (this month, non-cancelled) ───────────────────────────

  const catRevMap: Record<string, number> = {}
  monthOrders
    .filter(o => o.status !== 'cancelled')
    .forEach(order => {
      order.items?.forEach(item => {
        const catId = productCategoryMap[item.product_id]
        const catName = catId ? (categoryNameMap[catId] ?? 'Other') : 'Other'
        catRevMap[catName] = (catRevMap[catName] ?? 0) + item.price * item.quantity
      })
    })
  const categoryData = Object.entries(catRevMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([category, revenue]) => ({ category, revenue }))

  // ── Status breakdown ───────────────────────────────────────────────────────

  const statusCounts: Record<string, number> = {}
  windowOrders.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1
  })
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    color: STATUS_COLORS[status] ?? '#9CA3AF',
  }))

  // ── Format helpers ─────────────────────────────────────────────────────────

  const todayLabel = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  // Indian numbering (k / L / Cr) — see formatCompactINR.
  const formatRevenue = formatCompactINR

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 md:space-y-8">

      {/* ── Header + Quick Actions ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">
            Dashboard.
          </h1>
          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mt-1">
            {todayLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Product
          </Link>
          <Link
            href="/admin/categories"
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-table-border bg-surface-card text-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:border-primary/40 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Category
          </Link>
          <Link
            href="/admin/coupons/new"
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-table-border bg-surface-card text-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:border-primary/40 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Coupon
          </Link>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Orders"
          value={todayOrders.length.toString()}
          icon="shopping_basket"
          delta={todayDelta}
          deltaLabel="vs yesterday"
        />
        <StatCard
          label="Pending Orders"
          value={pendingOrders.length.toString()}
          icon="pending_actions"
          sub={pendingOrders.length > 0 ? `${placedCount} placed · ${confirmedCount} confirmed` : 'All clear'}
          subColor={pendingOrders.length > 0 ? 'text-error' : 'text-on-surface-variant'}
        />
        <StatCard
          label="Month Revenue"
          value={formatRevenue(monthRevenue)}
          icon="payments"
          sub={`${monthOrders.filter(o => o.status !== 'cancelled').length} orders`}
          subColor="text-on-surface-variant"
          inverted={true}
        />
        <StatCard
          label="Active Products"
          value={activeProductCount.toString()}
          icon="inventory_2"
          sub={lowStockProducts.length > 0 ? `⚠ ${lowStockProducts.length} low stock` : 'All in stock'}
          subColor={lowStockProducts.length > 0 ? 'text-error' : 'text-on-surface-variant'}
        />
      </div>

      {/* ── Charts Row: Line + Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface-card rounded-2xl border-2 border-table-border p-4">
          <DailyOrdersChart data={dailyData} />
        </div>
        <div className="bg-surface-card rounded-2xl border-2 border-table-border p-4">
          <StatusDonutChart data={statusData} />
        </div>
      </div>

      {/* ── Category Revenue Bar Chart ── */}
      <div className="bg-surface-card rounded-2xl border-2 border-table-border p-4">
        <CategoryRevenueChart data={categoryData} />
      </div>

      {/* ── Low Stock Alerts ── */}
      {lowStockProducts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-table-border">
            <span className="material-symbols-outlined text-error text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
            <h4 className="font-black text-lg text-primary uppercase tracking-wider">Low Stock Alerts</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {lowStockProducts.map(product => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
                className="flex items-center gap-3 p-4 bg-error/5 border-2 border-error/30 rounded-2xl hover:bg-error/10 transition-colors"
              >
                {product.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0]}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-error/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white border border-error/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-error text-[20px]">inventory_2</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-on-surface truncate">{product.name}</p>
                  {product.sku && (
                    <p className="font-black text-[10px] uppercase tracking-widest text-on-surface-variant/70">{product.sku}</p>
                  )}
                  <p className="font-black text-xs text-error mt-0.5">
                    {product.stock_qty} left
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent Orders ── */}
      <RecentOrdersTable initialOrders={recentOrders} />

    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, sub, subColor, delta, deltaLabel, inverted = false
}: {
  label: string
  value: string
  icon?: string
  sub?: string
  subColor?: string
  delta?: number
  deltaLabel?: string
  inverted?: boolean
}) {
  const showDelta = delta !== undefined && deltaLabel
  const deltaText = showDelta
    ? delta > 0 ? `▲ ${delta} ${deltaLabel}`
    : delta < 0 ? `▼ ${Math.abs(delta)} ${deltaLabel}`
    : `= Same ${deltaLabel}`
    : null
  const deltaColor = delta !== undefined
    ? delta > 0 ? 'text-success'
    : 'text-on-surface-variant'
    : ''

  if (inverted) {
    return (
      <div className="relative bg-primary p-5 rounded-2xl border-2 border-primary flex flex-col justify-between min-h-[140px] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
        <div className="relative z-10 flex justify-between items-start mb-4">
          <p className="font-black text-[10px] text-white/50 uppercase tracking-widest">{label}</p>
          {icon && <span className="material-symbols-outlined text-white/60 text-[20px]">{icon}</span>}
        </div>
        <div className="relative z-10">
          <p className="font-black text-3xl text-white tracking-tight">{value}</p>
          {deltaText && (
            <p className={`font-black text-[10px] uppercase tracking-wider mt-1 ${deltaColor === 'text-success' ? 'text-[#86efac]' : 'text-white/60'}`}>{deltaText}</p>
          )}
          {sub && !deltaText && (
            <p className={`font-black text-[10px] uppercase tracking-wider mt-1 ${subColor === 'text-error' ? 'text-[#fca5a5]' : 'text-white/60'}`}>{sub}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-card p-5 rounded-2xl border-2 border-table-border flex flex-col justify-between min-h-[140px]">
      <div className="flex justify-between items-start mb-4">
        <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest">{label}</p>
        {icon && <span className="material-symbols-outlined text-primary/40 text-[20px]">{icon}</span>}
      </div>
      <div>
        <p className="font-black text-3xl text-primary tracking-tight">{value}</p>
        {deltaText && (
          <p className={`font-black text-[10px] uppercase tracking-wider mt-1 ${deltaColor}`}>{deltaText}</p>
        )}
        {sub && !deltaText && (
          <p className={`font-black text-[10px] uppercase tracking-wider mt-1 ${subColor}`}>{sub}</p>
        )}
      </div>
    </div>
  )
}
