'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/database.types'
import { Download, Search, X, ArrowRight, FileText } from 'lucide-react'

type OrderRow = {
  id: string
  order_number?: string | null
  status: OrderStatus
  total: number
  created_at: string
  address: { name?: string; phone?: string } | null
  /** Number of lines in the order — the full `items` JSON is never sent here. */
  item_count: number
  payment_method: string
}

const STATUS_TABS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'placed',    label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed',    label: 'Packed' },
  { key: 'shipping',  label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_CHIP: Record<OrderStatus, string> = {
  placed:    'bg-surface-container-high text-on-surface-variant border-table-border',
  confirmed: 'bg-primary text-white border-primary',
  packed:    'bg-secondary-container text-on-secondary-container border-table-border',
  shipping:  'bg-primary/80 text-white border-primary',
  delivered: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-error/10 text-error border-error/30',
  returned:  'bg-surface-container text-on-surface-variant border-table-border',
}

export default function OrdersClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    let list = [...initialOrders]

    if (activeTab !== 'all') list = list.filter(o => o.status === activeTab)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.order_number?.toLowerCase().includes(q) ||
        (o.address as { phone?: string } | null)?.phone?.includes(q) ||
        (o.address as { name?: string } | null)?.name?.toLowerCase().includes(q),
      )
    }

    if (dateFrom) list = list.filter(o => new Date(o.created_at) >= new Date(dateFrom))
    if (dateTo)   list = list.filter(o => new Date(o.created_at) <= new Date(dateTo + 'T23:59:59'))

    return list
  }, [initialOrders, activeTab, search, dateFrom, dateTo])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: initialOrders.length }
    for (const o of initialOrders) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [initialOrders])

  function exportCSV() {
    const headers = ['Order #', 'Date', 'Customer', 'Phone', 'Items', 'Total', 'Payment', 'Status']
    const rows = filtered.map(o => {
      const addr = o.address as { name?: string; phone?: string } | null
      return [
        o.order_number || `KBS-${o.id.slice(-8).toUpperCase()}`,
        new Date(o.created_at).toLocaleDateString('en-IN'),
        `"${(addr?.name ?? '').replace(/"/g, '""')}"`,
        addr?.phone ?? '',
        o.item_count,
        o.total,
        o.payment_method.toUpperCase(),
        o.status,
      ]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `kuthari-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 md:space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">
            Orders.
          </h1>
          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mt-1">
            {filtered.length} orders shown
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-table-border bg-surface-card text-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:border-primary/40 transition-colors active:scale-95"
        >
          <Download size={16} strokeWidth={2.5} />
          Export CSV
        </button>
      </div>

      {/* ── Status Tabs ── */}
      <div className="overflow-x-auto scrollbar-hide pb-2">
        <div className="flex gap-2 min-w-max pb-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-primary border-primary text-white shadow-md'
                  : 'bg-surface-card border-table-border text-on-surface-variant hover:border-primary/40 hover:text-primary',
              )}
            >
              {tab.label}
              {counts[tab.key] !== undefined && (
                <span className={cn(
                  'px-2 py-0.5 rounded-md border font-black text-[9px]',
                  activeTab === tab.key
                    ? 'bg-white/20 border-white/30 text-white'
                    : 'bg-surface-container border-table-border/60 text-on-surface-variant',
                )}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-surface-card border-2 border-table-border p-4 rounded-2xl">
        <div className="relative flex-1 w-full min-w-[220px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" />
          <input
            type="text"
            placeholder="Search order # or customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm focus:outline-none focus:border-primary hover:border-primary/40 focus:shadow-[0_0_0_4px_rgba(27,44,61,0.07)] transition-all duration-200"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-black text-[10px] text-primary/40 uppercase tracking-widest">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm focus:outline-none focus:border-primary hover:border-primary/40 focus:shadow-[0_0_0_4px_rgba(27,44,61,0.07)] transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-black text-[10px] text-primary/40 uppercase tracking-widest">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm focus:outline-none focus:border-primary hover:border-primary/40 focus:shadow-[0_0_0_4px_rgba(27,44,61,0.07)] transition-all duration-200"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="p-3 rounded-xl border-2 border-error/20 bg-error/5 text-error hover:bg-error/10 hover:border-error/40 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <X size={16} strokeWidth={2.5} />
              <span className="sm:hidden font-black text-xs uppercase tracking-widest">Clear Dates</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-surface-card rounded-2xl border-2 border-table-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-surface-container border-2 border-table-border rounded-2xl flex items-center justify-center mb-4">
              <FileText size={24} className="text-on-surface-variant/40" />
            </div>
            <p className="font-black text-sm text-on-surface-variant uppercase tracking-widest">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary">
                  {['Order #', 'Date', 'Customer', 'Items', 'Total', 'Payment', 'Status', ''].map((h, i) => (
                    <th key={h} className={cn(
                      "py-4 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 whitespace-nowrap",
                      i !== 7 ? "border-r border-white/10" : ""
                    )}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, idx) => {
                  const addr = order.address as { name?: string; phone?: string } | null
                  const itemCount = order.item_count
                  return (
                    <tr
                      key={order.id}
                      className={cn(
                        "group hover:bg-surface-container-low transition-colors duration-150 hover:shadow-[inset_3px_0_0_0_var(--color-primary)]",
                        idx !== filtered.length - 1 ? "border-b-2 border-table-border" : ""
                      )}
                    >
                      <td className="py-4 px-5 border-r border-table-border">
                        <span className="font-black text-xs text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                          {order.order_number || `#${order.id.slice(-8).toUpperCase()}`}
                        </span>
                      </td>
                      <td className="py-4 px-5 border-r border-table-border">
                        <span className="font-bold text-sm text-on-surface-variant whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-4 px-5 border-r border-table-border">
                        <p className="font-bold text-sm text-on-surface">{addr?.name ?? '—'}</p>
                        {addr?.phone && (
                          <p className="font-black text-[10px] uppercase tracking-widest text-on-surface-variant mt-0.5">
                            {addr.phone}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-5 border-r border-table-border">
                        <span className="font-bold text-sm text-on-surface">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="py-4 px-5 border-r border-table-border">
                        <span className="font-black text-sm text-primary">
                          ₹{order.total.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-4 px-5 border-r border-table-border">
                        <span className="px-2 py-1 bg-surface border border-table-border text-on-surface-variant rounded-md font-black text-[9px] uppercase tracking-wider whitespace-nowrap">
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="py-4 px-5 border-r border-table-border">
                        <span className={cn('px-3 py-1.5 rounded-lg border-2 font-black text-[9px] uppercase tracking-wider whitespace-nowrap', STATUS_CHIP[order.status])}>
                          {order.status === 'shipping' ? 'Out for Delivery' : order.status}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="flex items-center justify-center p-2 rounded-xl border-2 border-table-border text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all active:scale-95 bg-surface"
                        >
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
