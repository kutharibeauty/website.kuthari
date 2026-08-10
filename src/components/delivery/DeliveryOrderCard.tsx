'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

export type DeliveryOrder = {
  id: string
  status: string
  total: number
  created_at: string
  delivered_at?: string | null
  address: { name?: string; phone?: string; line1?: string; city?: string } | null
  items: unknown[] | null
  payment_method: string
  otp_verified_at?: string | null
}

const STATUS_CHIP: Record<string, string> = {
  assigned:         'bg-amber-100 text-amber-700',
  processing:       'bg-amber-100 text-amber-700',
  confirmed:        'bg-blue-100 text-blue-700',
  packed:           'bg-amber-100 text-amber-700',
  shipping:         'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered:        'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<string, string> = {
  assigned:         'Ready for Pickup',
  processing:       'Ready for Pickup',
  confirmed:        'Confirmed',
  packed:           'Ready for Pickup',
  shipping:         'Out for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
}

export default function DeliveryOrderCard({ order }: { order: DeliveryOrder }) {
  const addr = order.address
  const itemCount = order.items?.length ?? 0

  return (
    <Link
      href={`/delivery/orders/${order.id}`}
      className="block bg-surface rounded-2xl border border-outline-variant/50 p-4 active:scale-[0.98] transition-transform"
      style={{ boxShadow: '0 2px 12px rgba(61,43,31,0.07)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Order #{order.id.slice(-8).toUpperCase()}
          </p>
          <p className="font-headline-sm text-headline-sm text-primary mt-0.5">
            {addr?.name ?? '—'}
          </p>
        </div>
        <span className={cn(
          'px-2.5 py-1 rounded-full font-label-sm text-label-sm shrink-0',
          STATUS_CHIP[order.status] ?? 'bg-surface-container text-on-surface-variant',
        )}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className="space-y-1.5 text-on-surface-variant">
        {addr?.phone && (
          <div className="flex items-center gap-2 font-body-md text-body-md">
            <span className="material-symbols-outlined text-[16px]">call</span>
            {addr.phone}
          </div>
        )}
        {addr?.line1 && (
          <div className="flex items-start gap-2 font-body-md text-body-md">
            <span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span>
            <span className="line-clamp-1">{addr.line1}{addr.city ? `, ${addr.city}` : ''}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/20">
        <span className="font-body-md text-body-md text-on-surface-variant">
          {itemCount} {itemCount === 1 ? 'item' : 'items'} · Prepaid
        </span>
        <span className="font-headline-sm text-headline-sm text-primary">
          ₹{order.total.toLocaleString('en-IN')}
        </span>
      </div>
    </Link>
  )
}
