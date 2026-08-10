'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { OrderStatus, OrderItem, Address } from '@/types/database.types'
import { ArrowLeft, Download, Clock, Phone, MapPin, Package, Edit3, Loader2 } from 'lucide-react'

type DeliveryPerson = { id: string; name: string; phone: string }

type OrderDetail = {
  id: string
  order_number?: string | null
  status: OrderStatus
  total: number
  subtotal: number
  delivery_fee: number
  discount?: number | null
  coupon_code?: string | null
  created_at: string
  updated_at: string
  address: Address | null
  items: OrderItem[]
  payment_method: string
  notes: string | null
  is_bulk: boolean
  estimated_delivery?: string | null
}

const STATUS_CHIP: Record<OrderStatus, string> = {
  placed:    'bg-surface-container-high text-on-surface-variant border-table-border',
  confirmed: 'bg-primary text-white border-primary',
  packed:    'bg-secondary-container text-on-secondary-container border-table-border',
  shipping:  'bg-primary/80 text-white border-primary',
  delivered: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-error/10 text-error border-error/30',
  returned:  'bg-surface-container text-on-surface-variant border-table-border',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed:    'Placed',
  confirmed: 'Confirmed',
  packed:    'Packed',
  shipping:  'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned:  'Returned',
}

const ALL_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled', 'returned']

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

export default function OrderDetailClient({
  order: initialOrder,
  deliveryPersons,
}: {
  order: OrderDetail
  deliveryPersons: DeliveryPerson[]
}) {
  const [order, setOrder] = useState(initialOrder)
  const [newStatus, setNewStatus] = useState<OrderStatus>(initialOrder.status)
  const [assignedTo, setAssignedTo] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [notes, setNotes] = useState(initialOrder.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function updateStatus() {
    if (newStatus === order.status && !assignedTo) return
    setUpdatingStatus(true)
    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setOrder(prev => ({ ...prev, status: newStatus }))
      showToast(`Status updated to ${STATUS_LABEL[newStatus]}`)
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string; detail?: string }
      showToast(d.detail ? `${d.error}: ${d.detail}` : (d.error ?? 'Failed to update status'))
    }
    setUpdatingStatus(false)
  }

  async function saveNotes() {
    setSavingNotes(true)
    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    if (res.ok) {
      setOrder(prev => ({ ...prev, notes }))
      showToast('Notes saved')
    }
    setSavingNotes(false)
  }

  const addr = order.address
  const showAssign = newStatus === 'shipping' && deliveryPersons.length > 0

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 md:space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-table-border pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-3 rounded-xl border-2 border-table-border bg-surface-card hover:bg-surface-container-low transition-colors text-primary active:scale-95"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight">
              {order.order_number || `#${order.id.slice(-8).toUpperCase()}`}
            </h1>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">
              {new Date(order.created_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
              {order.is_bulk && (
                <span className="ml-3 px-2 py-0.5 bg-primary text-white rounded-md">
                  BULK
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/api/orders/${order.id}/invoice`}
            target="_blank"
            className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-table-border bg-surface-card text-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:border-primary/40 transition-colors active:scale-95"
          >
            <Download size={16} strokeWidth={2.5} />
            Invoice
          </Link>
          <Link
            href={`/admin/orders/${order.id}/timeline`}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
          >
            <Clock size={16} strokeWidth={2.5} />
            Timeline
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

        {/* ── Left column: Customer + Items ── */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">

          {/* Customer info */}
          <Card title="Customer Profile">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest mb-1.5">Name</p>
                <p className="font-bold text-base text-primary">{addr?.name ?? '—'}</p>
              </div>
              <div>
                <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest mb-1.5">Phone</p>
                {addr?.phone ? (
                  <a
                    href={`tel:${addr.phone}`}
                    className="font-bold text-base text-primary hover:underline flex items-center gap-2 w-fit"
                  >
                    <Phone size={14} className="text-primary/50" />
                    {addr.phone}
                  </a>
                ) : <p className="font-bold text-base text-primary">—</p>}
              </div>
            </div>
          </Card>

          {/* Delivery address */}
          <Card title="Delivery Address">
            {addr ? (
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-primary/50 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-base text-primary">{addr.name}</p>
                  <p className="font-bold text-sm text-on-surface">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                  <p className="font-bold text-sm text-on-surface">{addr.city}, {addr.state} — {addr.pincode}</p>
                  <p className="font-bold text-sm text-on-surface-variant mt-1">{addr.phone}</p>
                  {addr.label && (
                    <span className="inline-block mt-2 px-2.5 py-1 border-2 border-table-border text-on-surface-variant rounded-lg font-black text-[10px] uppercase tracking-widest">
                      {addr.label}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="font-bold text-sm text-on-surface-variant">No address on file</p>
            )}
          </Card>

          {/* Order items */}
          <Card title={`Order Items (${order.items.length})`}>
            <div className="space-y-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-surface rounded-xl p-3 border-2 border-table-border">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border-2 border-table-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-surface border-2 border-table-border flex items-center justify-center flex-shrink-0">
                      <Package size={24} className="text-on-surface-variant/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-primary truncate">{item.name}</p>
                    <p className="font-black text-[10px] uppercase tracking-widest text-on-surface-variant mt-0.5">{item.unit}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-bold text-xs text-on-surface-variant">
                        {fmt(item.price)} × <span className="text-primary">{item.quantity}</span>
                      </p>
                      <p className="font-black text-sm text-primary">
                        {fmt(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="mt-6 pt-5 border-t-2 border-table-border space-y-3">
              <Row label="Subtotal" value={fmt(order.subtotal)} />
              {(order.discount ?? 0) > 0 && (
                <Row label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`} value={`-${fmt(order.discount!)}`} valueClass="text-success" />
              )}
              <Row label="Delivery" value={order.delivery_fee === 0 ? 'FREE' : fmt(order.delivery_fee)} />
              <div className="flex justify-between items-end pt-3 mt-1 border-t-2 border-table-border">
                <span className="font-black text-[10px] uppercase tracking-widest text-primary/50">Grand Total</span>
                <span className="font-black text-2xl text-primary tracking-tight">{fmt(order.total)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right column: Status + Payment + Notes ── */}
        <div className="space-y-6 md:space-y-8">

          {/* Current status */}
          <div className="bg-primary p-6 rounded-2xl border-2 border-primary relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
            <div className="relative z-10 space-y-5">
              <div className="flex flex-col gap-2 border-b-2 border-white/10 pb-4">
                <h3 className="font-black text-xs text-white/50 uppercase tracking-widest">
                  Current Status
                </h3>
                <span className={cn('w-fit px-4 py-1.5 rounded-xl border-2 font-black text-xs uppercase tracking-widest', 
                  order.status === 'delivered' ? 'bg-success/20 text-success border-success/30' : 
                  order.status === 'cancelled' ? 'bg-error/20 text-error border-error/30' : 
                  'bg-white text-primary border-white'
                )}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>

              <div className="space-y-4">
                <label className="block font-black text-[10px] text-white/70 uppercase tracking-widest">
                  Update Status
                </label>
                <div className="relative">
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as OrderStatus)}
                    className="w-full pl-4 pr-10 py-3 bg-white/10 border-2 border-white/20 rounded-xl font-bold text-sm text-white focus:outline-none focus:border-white transition-colors appearance-none"
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s} className="bg-primary text-white">{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white opacity-70">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </div>
                </div>

                {showAssign && (
                  <div className="relative">
                    <select
                      value={assignedTo}
                      onChange={e => setAssignedTo(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-white/10 border-2 border-white/20 rounded-xl font-bold text-sm text-white focus:outline-none focus:border-white transition-colors appearance-none"
                    >
                      <option value="" className="bg-primary text-white">Select delivery person…</option>
                      {deliveryPersons.map(p => (
                        <option key={p.id} value={p.id} className="bg-primary text-white">{p.name} — {p.phone}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white opacity-70">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={updateStatus}
                  disabled={updatingStatus || newStatus === order.status}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white text-primary rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/90 disabled:opacity-50 transition-opacity active:scale-95 shadow-sm"
                >
                  {updatingStatus && <Loader2 size={16} className="animate-spin" />}
                  {updatingStatus ? 'Updating…' : 'Save Status'}
                </button>
              </div>
            </div>
          </div>

          {/* Payment */}
          <Card title="Payment">
            <div className="space-y-4">
              <Row label="Method" value={order.payment_method.toUpperCase()} />
              <Row label="Amount" value={fmt(order.total)} />
              <div className="flex items-center justify-between pt-2 border-t-2 border-table-border">
                <span className="font-black text-[10px] uppercase tracking-widest text-on-surface-variant">Collection</span>
                <span className={cn(
                  'px-3 py-1 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest',
                  order.status === 'delivered' ? 'bg-success/10 text-success border-success/30' : 'bg-surface-container-high text-on-surface border-table-border',
                )}>
                  {order.status === 'delivered' ? 'Collected' : 'Pending'}
                </span>
              </div>
            </div>
          </Card>

          {/* Admin Notes */}
          <Card title="Admin Notes">
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Internal notes (not visible to customer)…"
                className="w-full px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary placeholder:font-medium placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors resize-none"
              />
              <button
                onClick={saveNotes}
                disabled={savingNotes || notes === (order.notes ?? '')}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-table-border bg-surface-card text-primary rounded-xl font-black text-xs uppercase tracking-widest hover:border-primary/40 disabled:opacity-50 transition-colors active:scale-95"
              >
                <Edit3 size={14} strokeWidth={2.5} />
                {savingNotes ? 'Saving…' : 'Save Notes'}
              </button>
            </div>
          </Card>

        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-primary text-white border-2 border-primary rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_8px_30px_rgba(44,24,16,0.3)]">
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-card rounded-2xl border-2 border-table-border p-6 space-y-5">
      <h3 className="font-black text-sm text-primary uppercase tracking-wider border-b-2 border-table-border pb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest">{label}</span>
      <span className={cn('font-bold text-sm text-primary', valueClass)}>{value}</span>
    </div>
  )
}
