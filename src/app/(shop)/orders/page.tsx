import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { AuthMetadata } from '@/types'
import type { Order } from '@/types/database.types'
import { Package, ArrowRight, ShoppingBag, Clock, CheckCircle, XCircle, Truck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'My Orders — Kuthari Beauty Store',
  description: 'Track your Kuthari Beauty Store orders — view status, delivery updates, invoices and reorder in one tap.',
  robots: { index: false },
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  placed:    { label: 'Order Placed',      dot: 'bg-on-surface-variant/40' },
  confirmed: { label: 'Confirmed',         dot: 'bg-primary' },
  packed:    { label: 'Packed',            dot: 'bg-primary' },
  shipping:  { label: 'Out for Delivery',  dot: 'bg-primary' },
  delivered: { label: 'Delivered',         dot: 'bg-success' },
  cancelled: { label: 'Cancelled',         dot: 'bg-error' },
  returned:  { label: 'Returned',          dot: 'bg-error' },
}

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default async function OrdersPage() {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/login')

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id
  if (!profileId) redirect('/')

  // `orders` is a service-role-only table (no anon/authenticated grant), so read
  // it via the admin client — scoped to the session's profileId for safety.
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('orders')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50)

  const orders = (data ?? []) as unknown as Order[]

  return (
    <div className="min-h-screen">
      {/* ── Hero strip ── */}
      <div className="relative overflow-hidden bg-primary border-b-2 border-primary mb-6">
        <div className="relative z-10 px-4 max-w-4xl mx-auto py-8 md:py-10">
          <span className="text-[11px] font-black text-white/40 mb-2 block">
            Account
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">My Orders</h1>
          <p className="text-xs text-white/45 font-medium mt-0.5">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} placed
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-10">
        {orders.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="relative">
              <div className="w-20 h-20 border-2 border-table-border bg-surface-card flex items-center justify-center rounded-3xl">
                <ShoppingBag size={32} className="text-on-surface-variant/30" strokeWidth={1.5} />
              </div>
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-[12px] font-black">0</span>
              </div>
            </div>
            <div className="max-w-xs">
              <p className="font-black text-primary text-lg tracking-tight">No orders yet</p>
              <p className="text-sm text-on-surface-variant/70 font-medium mt-1.5 leading-relaxed">
                Place your first bulk order from our catalogue.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full max-w-xs">
              <div className="h-px flex-1 bg-table-border" />
              <span className="text-[12px] font-black text-on-surface-variant/40">or</span>
              <div className="h-px flex-1 bg-table-border" />
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-black text-xs rounded-xl hover:bg-primary/90 transition duration-200 active:scale-95"
            >
              Browse Products <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, dot: 'bg-primary' }
              const orderId = order.order_number || `KBS-${order.id.slice(0, 8).toUpperCase()}`
              const isDelivered = order.status === 'delivered'
              const isCancelled = order.status === 'cancelled' || order.status === 'returned'

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="group bg-surface-card border-2 border-table-border hover:border-primary/40 rounded-2xl p-5 transition duration-200 block"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isDelivered ? 'bg-success/10' : isCancelled ? 'bg-error/10' : 'bg-primary/8'
                      }`}>
                        {isDelivered
                          ? <CheckCircle size={18} className="text-success" />
                          : isCancelled
                          ? <XCircle size={18} className="text-error" />
                          : order.status === 'shipping'
                          ? <Truck size={18} className="text-primary" />
                          : <Package size={18} className="text-primary" />
                        }
                      </div>
                      <div>
                        <p className="font-black text-primary text-sm">
                          #{orderId}
                        </p>
                        <p className="text-[12px] font-medium text-on-surface-variant/50 mt-0.5 flex items-center gap-1">
                          <Clock size={10} /> {fmtDate(order.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`flex items-center gap-1.5 text-[13px] font-bold px-2.5 py-1.5 rounded-full border-2 flex-shrink-0 ${
                      isDelivered
                        ? 'border-success/30 text-success'
                        : isCancelled
                        ? 'border-error/30 text-error'
                        : 'border-primary/30 text-primary'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-table-border mb-4" />

                  {/* Items preview */}
                  <div className="mb-4">
                    <p className="text-[12px] font-black text-on-surface-variant/40 mb-2">
                      Items
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {order.items.slice(0, 3).map((item, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-bold text-on-surface-variant border border-table-border rounded-full px-2.5 py-0.5 truncate max-w-[160px]"
                        >
                          {item.name} ×{item.quantity}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-[11px] font-black text-primary border border-primary/30 rounded-full px-2.5 py-0.5">
                          +{order.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-black text-on-surface-variant/40">Total</p>
                      <p className="text-lg font-black text-primary">{fmt(order.total)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-on-surface-variant/40 group-hover:text-primary transition-colors duration-200">
                      View Details <ArrowRight size={13} strokeWidth={2.5} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
