'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { OrderStatus } from '@/types/database.types'

const ALL_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled', 'returned']

const STATUS_CHIP: Record<OrderStatus, string> = {
  placed:    'bg-surface-container-high text-on-surface-variant border-table-border',
  confirmed: 'bg-primary text-white border-primary',
  packed:    'bg-secondary-container text-on-secondary-container border-table-border',
  shipping:  'bg-primary/80 text-white border-primary',
  delivered: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-error/10 text-error border-error/30',
  returned:  'bg-surface-container text-on-surface-variant border-table-border',
}

export type RecentOrderRow = {
  id: string
  /** The invoice number printed on the PDF ("Invoice No.", e.g. KBS/2026-2027/5). */
  order_number: string | null
  status: OrderStatus
  total: number
  created_at: string
  address: { name?: string; phone?: string } | null
  items: { product_id: string; quantity: number }[] | null
}

export default function RecentOrdersTable({ initialOrders }: { initialOrders: RecentOrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [updating, setUpdating] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)

  async function changeStatus(orderId: string, status: OrderStatus) {
    setUpdating(orderId)
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      showToast(`Order marked ${status}`, 'success')
    } else {
      showToast('Failed to update order', 'error')
    }
    setUpdating(null)
  }

  return (
    <section className="bg-surface-card rounded-2xl border-2 border-table-border overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b-2 border-table-border bg-surface-container-low">
        <h4 className="font-bold text-lg text-primary">Recent Orders</h4>
        <Link href="/admin/orders" className="text-xs font-bold text-primary hover:underline decoration-2 underline-offset-4">
          View all →
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/50">receipt_long</span>
          </div>
          <p className="font-bold text-sm text-on-surface-variant">No recent orders.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary">
                {['Order #', 'Customer', 'Items', 'Total', 'Status', 'Date', ''].map((h, i) => (
                  <th key={h} className={cn(
                    "py-3 px-5 text-[12px] font-bold text-white/70 whitespace-nowrap",
                    i !== 6 ? "border-r border-white/10" : ""
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => {
                const addr = order.address
                const itemCount = order.items?.length ?? 0
                return (
                  <tr
                    key={order.id}
                    className={cn(
                      "group hover:bg-surface-container-low transition-colors",
                      idx !== orders.length - 1 ? "border-b-2 border-table-border" : ""
                    )}
                  >
                    <td className="py-4 px-5 border-r border-table-border">
                      {/* The invoice number as printed on the PDF, not a slice of
                          the internal UUID. Falls back to the old truncated id
                          only for legacy rows that predate order_number. */}
                      <span className="font-bold text-xs text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                        {order.order_number ?? `#${order.id.slice(-8).toUpperCase()}`}
                      </span>
                    </td>
                    <td className="py-4 px-5 border-r border-table-border">
                      <p className="font-bold text-sm text-on-surface">{addr?.name ?? '—'}</p>
                      <p className="font-bold text-[12px] text-on-surface-variant mt-0.5">{addr?.phone ?? ''}</p>
                    </td>
                    <td className="py-4 px-5 border-r border-table-border">
                      <span className="font-bold text-sm text-on-surface">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </td>
                    <td className="py-4 px-5 border-r border-table-border">
                      <span className="font-bold text-sm text-primary">
                        ₹{order.total.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-4 px-5 border-r border-table-border">
                      <div className="relative">
                        <select
                          value={order.status}
                          disabled={updating === order.id}
                          onChange={e => changeStatus(order.id, e.target.value as OrderStatus)}
                          className={cn(
                            'font-bold text-[12px] rounded-xl px-4 py-2 border-2 outline-none cursor-pointer appearance-none disabled:opacity-50 transition focus:ring-2 focus:ring-primary focus:ring-offset-1 w-full',
                            STATUS_CHIP[order.status],
                          )}
                        >
                          {ALL_STATUSES.map(s => (
                            <option key={s} value={s} className="bg-surface text-on-surface capitalize font-medium">{s}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-current opacity-70">
                          <span className="material-symbols-outlined text-[16px]">expand_more</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 border-r border-table-border font-bold text-xs text-on-surface-variant whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-4 px-5">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center justify-center p-2 rounded-xl border-2 border-table-border text-on-surface-variant hover:border-primary/40 hover:text-primary transition active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
