'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import DeliveryOrderCard, { type DeliveryOrder } from '@/components/delivery/DeliveryOrderCard'

type Tab = 'pending' | 'completed'

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getDate() === now.getDate()
    && d.getMonth() === now.getMonth()
    && d.getFullYear() === now.getFullYear()
}

export default function DeliveryDashboardPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pending')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/delivery/orders')
      .then(r => r.json())
      .then(d => {
        if (d.error === 'Unauthorized') { router.replace('/delivery/login'); return }
        setOrders(d.orders ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const pending = useMemo(() =>
    orders.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status)),
    [orders],
  )

  const completedToday = useMemo(() =>
    orders.filter(o => o.status === 'delivered' && o.delivered_at && isToday(o.delivered_at)),
    [orders],
  )

  const listed = tab === 'pending' ? pending : completedToday

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background px-4 pt-6 pb-3 border-b border-outline-variant/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">My Orders</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Kuthari Beauty Store Delivery</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[22px]">person</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-container rounded-xl p-1">
          {(['pending', 'completed'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 rounded-lg font-body-md text-body-md font-medium transition-colors',
                tab === t
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-on-surface-variant',
              )}
            >
              {t === 'pending' ? `Pending (${pending.length})` : `Done Today (${completedToday.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Order list */}
      <div className="p-4 space-y-3 pb-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl h-36 animate-pulse" />
          ))
        ) : listed.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px]">
              {tab === 'pending' ? 'local_shipping' : 'check_circle'}
            </span>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-3">
              {tab === 'pending' ? 'No pending orders' : 'No deliveries completed today'}
            </p>
          </div>
        ) : (
          listed.map(order => (
            <DeliveryOrderCard key={order.id} order={order} />
          ))
        )}
      </div>
    </div>
  )
}
