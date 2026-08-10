'use client'

import { useState } from 'react'
import {
  ComposedChart, Bar, Line, AreaChart, Area,
  BarChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Download, BarChart2 } from 'lucide-react'
import { cn, formatCompactINR } from '@/lib/utils'

// ── Shared types ───────────────────────────────────────────────────────────────

export type MonthPoint    = { month: string; revenue: number; orders: number; avg: number }
export type ProductPoint  = { name: string; revenue: number; units: number }
export type CategoryPoint = { category: string; revenue: number }
export type StatusPoint   = { status: string; count: number; color: string }
export type CouponPoint   = { code: string; count: number; type: string; value: number }
export type PincodePoint  = { pincode: string; count: number; city: string | null }
export type CustomerPoint = { month: string; count: number }

export type CustomerSegments = {
  newCustomers: number       // placed exactly 1 order
  returning: number          // placed 2+ orders
  highValue: number          // total spend > ₹5 000
  bulkBuyers: number         // at least 1 bulk order
}

export type AnalyticsSummary = {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  uniqueCustomers: number
  repeatCustomers: number
  repeatRate: number
}

// ── Colour palette ─────────────────────────────────────────────────────────────

const BRAND   = '#000000'
const BRAND2  = '#333333'
const BRAND3  = '#666666'
const BRAND4  = '#999999'
const STATUS_COLORS: Record<string, string> = {
  placed:    '#6B7280',
  confirmed: '#3B82F6',
  packed:    '#F59E0B',
  shipping:  '#8B5CF6',
  delivered: '#0C831F',
  cancelled: '#DC2626',
}
const BAR_PALETTE = ['#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6']

// Indian numbering (k / L / Cr) — see formatCompactINR.
const rupee = formatCompactINR

const TOOLTIP_STYLE = {
  background: '#ffffff', border: '2px solid #000000',
  borderRadius: 12, fontSize: 12, fontFamily: 'inherit', fontWeight: 'bold'
}
const TICK = { fontSize: 10, fill: '#000000', fontFamily: 'inherit', fontWeight: 'bold' }

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AnalyticsCharts({
  monthly,
  statusBreakdown,
  topByRevenue,
  topByUnits,
  categoryRevenue,
  newCustomers,
  couponUsage,
  pincodeHeatmap,
  summary,
  segments,
}: {
  monthly: MonthPoint[]
  statusBreakdown: StatusPoint[]
  topByRevenue: ProductPoint[]
  topByUnits: ProductPoint[]
  categoryRevenue: CategoryPoint[]
  newCustomers: CustomerPoint[]
  couponUsage: CouponPoint[]
  pincodeHeatmap: PincodePoint[]
  summary: AnalyticsSummary
  segments: CustomerSegments
}) {
  const [activeProduct, setActiveProduct] = useState<'revenue' | 'units'>('revenue')

  function exportCSV() {
    const sections: string[] = []

    sections.push('=== SUMMARY ===')
    sections.push('Metric,Value')
    sections.push(`Total Revenue,${summary.totalRevenue.toFixed(2)}`)
    sections.push(`Total Orders,${summary.totalOrders}`)
    sections.push(`Avg Order Value,${summary.avgOrderValue.toFixed(2)}`)
    sections.push(`Unique Customers,${summary.uniqueCustomers}`)
    sections.push(`Repeat Customers,${summary.repeatCustomers}`)
    sections.push(`Repeat Rate,${summary.repeatRate.toFixed(1)}%`)

    sections.push('\n=== MONTHLY REVENUE (LAST 12 MONTHS) ===')
    sections.push('Month,Revenue,Orders,Avg Order Value')
    monthly.forEach(m => sections.push(`${m.month},${m.revenue.toFixed(2)},${m.orders},${m.avg.toFixed(2)}`))

    sections.push('\n=== ORDER STATUS BREAKDOWN ===')
    sections.push('Status,Count')
    statusBreakdown.forEach(s => sections.push(`${s.status},${s.count}`))

    sections.push('\n=== TOP 10 PRODUCTS BY REVENUE ===')
    sections.push('Product,Revenue,Units Sold')
    topByRevenue.forEach(p => sections.push(`"${p.name.replace(/"/g, '""')}",${p.revenue.toFixed(2)},${p.units}`))

    sections.push('\n=== TOP 10 PRODUCTS BY UNITS SOLD ===')
    sections.push('Product,Units Sold,Revenue')
    topByUnits.forEach(p => sections.push(`"${p.name.replace(/"/g, '""')}",${p.units},${p.revenue.toFixed(2)}`))

    sections.push('\n=== REVENUE BY CATEGORY ===')
    sections.push('Category,Revenue')
    categoryRevenue.forEach(c => sections.push(`"${c.category}",${c.revenue.toFixed(2)}`))

    sections.push('\n=== NEW CUSTOMERS PER MONTH ===')
    sections.push('Month,New Customers')
    newCustomers.forEach(c => sections.push(`${c.month},${c.count}`))

    sections.push('\n=== MOST USED COUPONS ===')
    sections.push('Code,Uses,Type,Value')
    couponUsage.forEach(c => sections.push(`${c.code},${c.count},${c.type},${c.value}`))

    sections.push('\n=== UNSERVICEABLE PINCODES (TOP 10) ===')
    sections.push('Pincode,Attempts,City')
    pincodeHeatmap.forEach(p => sections.push(`${p.pincode},${p.count},${p.city ?? ''}`))

    const csv = sections.join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `bcr-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">
            Analytics.
          </h1>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">
            Store performance & insights
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors active:scale-95 shadow-sm"
        >
          <Download size={16} strokeWidth={2.5} />
          Export CSV
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Revenue',   value: rupee(summary.totalRevenue) },
          { label: 'Total Orders',    value: summary.totalOrders.toLocaleString('en-IN') },
          { label: 'Avg Order Value', value: rupee(summary.avgOrderValue) },
          { label: 'Customers',       value: summary.uniqueCustomers.toLocaleString('en-IN') },
          { label: 'Repeat Customers',value: summary.repeatCustomers.toLocaleString('en-IN') },
          { label: 'Repeat Rate',     value: `${summary.repeatRate.toFixed(1)}%` },
        ].map(card => (
          <div key={card.label} className="bg-surface-card rounded-2xl border-2 border-table-border p-5">
            <p className="font-black text-2xl lg:text-3xl text-primary leading-tight truncate" title={card.value}>{card.value}</p>
            <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest mt-2 truncate" title={card.label}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── Row 1: Monthly Revenue + Status Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Revenue (combo bar+line) */}
        <ChartCard title="Revenue by Month" sub="Last 12 months" className="lg:col-span-2">
          {monthly.every(m => m.revenue === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={1} vertical={false} />
                <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis yAxisId="rev" tick={TICK} tickLine={false} axisLine={false} tickFormatter={rupee} />
                <YAxis yAxisId="ord" orientation="right" tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown, name: unknown) => [name === 'revenue' ? rupee(Number(v)) : String(v ?? ''), name === 'revenue' ? 'Revenue' : 'Orders']}
                />
                <Bar yAxisId="rev" dataKey="revenue" fill={BRAND4} radius={[4, 4, 0, 0]} />
                <Line yAxisId="ord" type="monotone" dataKey="orders" stroke={BRAND} strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: BRAND }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Order Status Donut */}
        <ChartCard title="Order Status" sub="All time breakdown">
          {statusBreakdown.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="count" nameKey="status" stroke="none">
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] ?? BAR_PALETTE[i % BAR_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, String(n)]} />
                <Legend iconType="circle" iconSize={10} formatter={v => (
                  <span style={{ fontSize: 10, fontFamily: 'inherit', fontWeight: 'bold', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 4 }}>{v}</span>
                )} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 2: Avg Order Value + New Customers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Avg Order Value" sub="Trend over 12 months">
          {monthly.every(m => m.avg === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={1} vertical={false} />
                <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={rupee} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [rupee(Number(v)), 'Avg Order Value']} />
                <Area type="monotone" dataKey="avg" stroke={BRAND} strokeWidth={3} fill="url(#avgGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: BRAND }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="New Customers" sub="Per month">
          {newCustomers.every(c => c.count === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={newCustomers} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={1} vertical={false} />
                <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [String(v ?? ''), 'New Customers']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {newCustomers.map((_, i) => <Cell key={i} fill={BRAND2} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: Top Products ── */}
      <ChartCard
        title="Top 10 Products"
        sub={activeProduct === 'revenue' ? 'By revenue' : 'By units sold'}
        headerRight={
          <div className="flex bg-surface border-2 border-table-border rounded-xl overflow-hidden p-1">
            {(['revenue', 'units'] as const).map(k => (
              <button
                key={k}
                onClick={() => setActiveProduct(k)}
                className={cn(
                  'px-4 py-2 font-black text-[10px] uppercase tracking-widest transition-colors rounded-lg',
                  activeProduct === k ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-card',
                )}
              >
                {k === 'revenue' ? 'Revenue' : 'Units'}
              </button>
            ))}
          </div>
        }
      >
        {(activeProduct === 'revenue' ? topByRevenue : topByUnits).length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={activeProduct === 'revenue' ? topByRevenue : topByUnits}
              layout="vertical"
              margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={1} horizontal={false} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false}
                tickFormatter={activeProduct === 'revenue' ? rupee : v => String(v)} />
              <YAxis type="category" dataKey="name" tick={{ ...TICK, fontSize: 9 }} tickLine={false} axisLine={false} width={150}
                tickFormatter={v => (v as string).length > 22 ? (v as string).slice(0, 22) + '…' : v as string} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v: unknown) => [activeProduct === 'revenue' ? rupee(Number(v)) : String(v ?? ''), activeProduct === 'revenue' ? 'Revenue' : 'Units']} />
              <Bar dataKey={activeProduct} radius={[0, 4, 4, 0]}>
                {(activeProduct === 'revenue' ? topByRevenue : topByUnits).map((_, i) => (
                  <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Row 4: Category Revenue ── */}
      <ChartCard title="Revenue by Category" sub="This year">
        {categoryRevenue.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryRevenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={1} vertical={false} />
              <XAxis dataKey="category" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={rupee} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [rupee(Number(v)), 'Revenue']} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {categoryRevenue.map((_, i) => <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Row 5: Coupons + Pincodes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Most used coupons */}
        <DataTable
          title="Most Used Coupons"
          sub="By redemption count"
          empty={couponUsage.length === 0}
          headers={['Code', 'Uses', 'Type', 'Value']}
          rows={couponUsage.map(c => [
            <span key="code" className="font-mono font-black text-primary px-3 py-1 bg-surface border-2 border-table-border rounded-lg text-xs">{c.code}</span>,
            <span key="count" className="font-black text-sm">{c.count}</span>,
            <span key="type" className={cn('px-3 py-1 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest', c.type === 'percentage' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200')}>
              {c.type === 'percentage' ? '%' : '₹'}
            </span>,
            <span key="val" className="font-black text-sm">{c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</span>,
          ])}
        />

        {/* Unserviceable pincodes */}
        <DataTable
          title="Unserviceable Pincode Heatmap"
          sub="Top 10 failed delivery attempts"
          empty={pincodeHeatmap.length === 0}
          headers={['Pincode', 'City', 'Attempts']}
          rows={pincodeHeatmap.map((p) => [
            <span key="pin" className="font-mono font-black text-sm">{p.pincode}</span>,
            <span key="city" className="font-bold text-sm text-on-surface-variant">{p.city ?? '—'}</span>,
            <div key="count" className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-surface border-2 border-table-border rounded-full overflow-hidden max-w-[80px]">
                <div
                  className="h-full bg-error"
                  style={{ width: `${pincodeHeatmap[0]?.count ? (p.count / pincodeHeatmap[0].count) * 100 : 0}%` }}
                />
              </div>
              <span className="font-black text-sm text-error">{p.count}</span>
            </div>,
          ])}
        />
      </div>

      {/* ── Customer Segments ──────────────────────────────────────────────── */}
      <div className="bg-surface-card rounded-2xl border-2 border-table-border p-6 md:p-8">
        <div className="border-b-2 border-table-border pb-4 mb-6">
          <h3 className="font-black text-xl text-primary">Customer Segments.</h3>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">
            All-time customer breakdown
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'New Customers', value: segments.newCustomers, sub: '1 order placed', color: 'bg-blue-50 text-blue-800 border-blue-200' },
            { label: 'Returning',     value: segments.returning,    sub: '2+ orders placed', color: 'bg-green-50 text-green-800 border-green-200' },
            { label: 'High-Value',    value: segments.highValue,    sub: 'Total spend > ₹5 000', color: 'bg-amber-50 text-amber-800 border-amber-200' },
            { label: 'Bulk Buyers',   value: segments.bulkBuyers,   sub: 'Has bulk order', color: 'bg-purple-50 text-purple-800 border-purple-200' },
          ].map((seg) => (
            <div
              key={seg.label}
              className="rounded-2xl border-2 border-table-border p-5 bg-surface flex flex-col items-start gap-4"
            >
              <span className={`px-3 py-1.5 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest ${seg.color}`}>
                {seg.label}
              </span>
              <div>
                <span className="text-4xl font-black text-primary block">{seg.value}</span>
                <span className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-1 block">{seg.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ChartCard({
  title, sub, children, className, headerRight,
}: {
  title: string
  sub: string
  children: React.ReactNode
  className?: string
  headerRight?: React.ReactNode
}) {
  return (
    <div className={cn('bg-surface-card rounded-2xl border-2 border-table-border p-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-table-border pb-4 mb-6">
        <div>
          <h3 className="font-black text-xl text-primary">{title}.</h3>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">{sub}</p>
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center gap-3 text-on-surface-variant bg-surface border-2 border-dashed border-table-border rounded-2xl">
      <BarChart2 size={32} strokeWidth={2.5} className="text-on-surface-variant/40" />
      <p className="font-black text-[10px] uppercase tracking-widest text-on-surface-variant">No data yet</p>
    </div>
  )
}

function DataTable({
  title, sub, headers, rows, empty,
}: {
  title: string
  sub: string
  headers: string[]
  rows: React.ReactNode[][]
  empty: boolean
}) {
  return (
    <div className="bg-surface-card rounded-2xl border-2 border-table-border overflow-hidden flex flex-col">
      <div className="p-6 border-b-2 border-table-border bg-surface">
        <h3 className="font-black text-xl text-primary">{title}.</h3>
        <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">{sub}</p>
      </div>
      <div className="flex-1 overflow-x-auto">
        {empty ? (
          <div className="py-24 text-center text-on-surface-variant font-black text-[10px] uppercase tracking-widest">No data yet</div>
        ) : (
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                {headers.map((h, i) => (
                  <th key={h} className={cn("px-5 py-3 font-black text-[10px] uppercase tracking-[0.2em] text-white/70", i !== headers.length - 1 ? 'border-r border-white/10' : '')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={cn("hover:bg-surface-container-low transition-colors group", i !== rows.length - 1 ? 'border-b-2 border-table-border' : '')}>
                  {row.map((cell, j) => (
                    <td key={j} className={cn("px-5 py-4 font-bold text-sm text-primary", j !== row.length - 1 ? 'border-r border-table-border' : '')}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
