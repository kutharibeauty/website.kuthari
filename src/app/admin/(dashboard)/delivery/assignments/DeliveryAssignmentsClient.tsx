'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/database.types'

type AssignmentOrder = {
  id: string
  status: OrderStatus
  total: number
  created_at: string
  address: {
    name: string
    phone: string
    line1: string
    city: string
    state: string
    pincode: string
  } | null
  items: { name: string; quantity: number }[] | null
}

type DeliveryPerson = {
  id: string
  name: string
  phone: string
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipping: 'Out for Delivery',
}

const STATUS_CHIP: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-amber-100 text-amber-700',
  shipping: 'bg-purple-100 text-purple-700',
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: 'packed',
  packed: 'shipping',
  shipping: 'delivered',
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Mark Packed',
  packed: 'Dispatch',
  shipping: 'Mark Delivered',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function DeliveryAssignmentsClient({
  orders: initialOrders,
  persons,
}: {
  orders: AssignmentOrder[]
  persons: DeliveryPerson[]
}) {
  const [orders, setOrders] = useState(initialOrders)
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return orders
    return orders.filter(o => o.status === statusFilter)
  }, [orders, statusFilter])

  const counts = useMemo(() => ({
    all: orders.length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    packed: orders.filter(o => o.status === 'packed').length,
    shipping: orders.filter(o => o.status === 'shipping').length,
  }), [orders])

  async function advanceStatus(orderId: string, current: OrderStatus) {
    const next = NEXT_STATUS[current]
    if (!next) return
    setUpdating(prev => ({ ...prev, [orderId]: true }))
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) {
      if (next === 'delivered') {
        setOrders(prev => prev.filter(o => o.id !== orderId))
        showToast('Order marked as delivered and removed from queue')
      } else {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next } : o))
        showToast(`Order updated to "${STATUS_LABEL[next] ?? next}"`)
      }
    } else {
      showToast('Failed to update order status')
    }
    setUpdating(prev => ({ ...prev, [orderId]: false }))
  }

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-max-width mx-auto w-full pb-12 space-y-gutter">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
            Delivery Queue
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {orders.length} active {orders.length === 1 ? 'order' : 'orders'} pending delivery
          </p>
        </div>
        <Link
          href="/admin/delivery/persons"
          className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-full font-body-md text-body-md hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">group</span>
          {persons.length} Delivery {persons.length === 1 ? 'Person' : 'Persons'}
        </Link>
      </div>

      {/* Delivery team quick reference */}
      {persons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {persons.map(p => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full border border-outline-variant/50">
              <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                <span className="font-label-sm text-label-sm text-primary font-bold">{p.name[0]?.toUpperCase()}</span>
              </div>
              <span className="font-body-md text-body-md text-on-surface text-sm">{p.name}</span>
              <a href={`tel:${p.phone}`} className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary">{p.phone}</a>
            </div>
          ))}
        </div>
      )}

      {persons.length === 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <p className="font-body-md text-body-md text-amber-800">
            No delivery persons registered.{' '}
            <Link href="/admin/delivery/persons" className="font-semibold underline">Add delivery persons</Link>
            {' '}before assigning orders.
          </p>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-outline-variant/30 overflow-x-auto scrollbar-hide">
        {([
          { key: 'all',       label: `All (${counts.all})` },
          { key: 'confirmed', label: `Confirmed (${counts.confirmed})` },
          { key: 'packed',    label: `Packed (${counts.packed})` },
          { key: 'shipping',  label: `Out for Delivery (${counts.shipping})` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-5 py-2.5 font-body-md text-body-md transition-colors whitespace-nowrap border-b-2 -mb-px',
              statusFilter === tab.key
                ? 'text-primary border-primary'
                : 'text-on-surface-variant border-transparent hover:text-on-surface',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center bg-surface rounded-2xl border border-outline-variant/50">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px]" style={{ fontVariationSettings: "'FILL' 0" }}>local_shipping</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-3">
            {statusFilter === 'all' ? 'No active orders in the delivery queue.' : `No "${STATUS_LABEL[statusFilter]}" orders.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const shortId = `KBS-${order.id.slice(0, 8).toUpperCase()}`
            const nextStatus = NEXT_STATUS[order.status]
            const nextLabel = NEXT_LABEL[order.status]
            const isUpdating = !!updating[order.id]

            return (
              <div
                key={order.id}
                className="bg-surface rounded-2xl border border-outline-variant/50 p-5 space-y-4"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-headline-md text-headline-md text-primary hover:underline"
                      >
                        #{shortId}
                      </Link>
                      <span className={cn('px-2.5 py-0.5 rounded-full font-label-sm text-label-sm', STATUS_CHIP[order.status] ?? 'bg-surface-container text-on-surface-variant')}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {fmtDate(order.created_at)} · ₹{order.total.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {nextStatus && nextLabel && (
                    <button
                      onClick={() => advanceStatus(order.id, order.status)}
                      disabled={isUpdating}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-2 rounded-full font-body-md text-body-md transition-opacity hover:opacity-90 disabled:opacity-50',
                        nextStatus === 'delivered'
                          ? 'bg-green-600 text-white'
                          : nextStatus === 'shipping'
                          ? 'bg-primary text-on-primary'
                          : 'bg-secondary-container text-on-secondary-container',
                      )}
                    >
                      {isUpdating
                        ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-[16px]">
                            {nextStatus === 'delivered' ? 'check_circle' : nextStatus === 'shipping' ? 'local_shipping' : 'inventory_2'}
                          </span>
                      }
                      {isUpdating ? 'Updating…' : nextLabel}
                    </button>
                  )}
                </div>

                {/* Address */}
                {order.address && (
                  <div className="flex items-start gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary mt-0.5 flex-shrink-0">location_on</span>
                    <div>
                      <span className="font-semibold text-on-surface">{order.address.name}</span>
                      {' · '}
                      <a href={`tel:${order.address.phone}`} className="hover:text-primary">{order.address.phone}</a>
                      <br />
                      <span>{order.address.line1}, {order.address.city}, {order.address.state} {order.address.pincode}</span>
                      {' '}
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(`${order.address.line1}, ${order.address.city}, ${order.address.pincode}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                        Maps
                      </a>
                    </div>
                  </div>
                )}

                {/* Items summary */}
                {order.items && order.items.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {order.items.slice(0, 4).map((item, i) => (
                      <span key={i} className="px-2.5 py-0.5 bg-surface-container rounded-full font-label-sm text-label-sm text-on-surface-variant">
                        {item.name} ×{item.quantity}
                      </span>
                    ))}
                    {order.items.length > 4 && (
                      <span className="px-2.5 py-0.5 bg-surface-container rounded-full font-label-sm text-label-sm text-on-surface-variant">
                        +{order.items.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-on-surface text-surface rounded-full font-body-md text-body-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
