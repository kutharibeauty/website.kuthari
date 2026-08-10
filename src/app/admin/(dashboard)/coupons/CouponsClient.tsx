'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { Coupon } from '@/types/database.types'
import { Plus, Tag, Edit3, Trash2, Loader2 } from 'lucide-react'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpired(coupon: Coupon) {
  if (!coupon.valid_until) return false
  return new Date(coupon.valid_until) < new Date()
}

function usagePercent(coupon: Coupon) {
  if (!coupon.max_uses) return null
  return Math.min(100, Math.round((coupon.uses_count / coupon.max_uses) * 100))
}

export default function CouponsClient({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)

  async function toggleActive(id: string, current: boolean) {
    setSaving(prev => ({ ...prev, [id]: true }))
    const res = await fetch(`/api/coupons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
      showToast('Changes saved successfully', 'success')
    } else {
      showToast('Failed to save changes', 'error')
    }
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  async function deleteCoupon(id: string, code: string) {
    if (!confirm(`Delete coupon "${code}"?`)) return
    setDeleting(id)
    const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCoupons(prev => prev.filter(c => c.id !== id))
      showToast('Coupon deleted', 'success')
    } else {
      showToast('Failed to delete coupon', 'error')
    }
    setDeleting(null)
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">
            Coupons.
          </h1>
          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mt-1">
            {coupons.length} coupon{coupons.length !== 1 ? 's' : ''} active
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="flex items-center gap-1.5 px-5 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Coupon
        </Link>
      </div>

      {/* ── Table ── */}
      <div className="bg-surface-card rounded-2xl border-2 border-table-border overflow-hidden">
        {coupons.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-surface border-2 border-table-border rounded-2xl flex items-center justify-center mb-4">
              <Tag size={24} className="text-on-surface-variant/40" />
            </div>
            <p className="font-black text-sm uppercase tracking-widest text-on-surface-variant mb-6">No coupons yet.</p>
            <Link
              href="/admin/coupons/new"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
            >
              <Plus size={16} strokeWidth={2.5} />
              Create first coupon
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-primary text-white">
                  {['Code', 'Type', 'Value', 'Min Order', 'Cap', 'Usage', 'Valid Until', 'Active', 'Actions'].map((h, i) => (
                    <th key={h} className={cn("py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70", i < 8 ? "border-r border-white/10" : "", h === "Actions" || h === "Active" ? "text-center" : "")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon, idx) => {
                  const pct = usagePercent(coupon)
                  const expired = isExpired(coupon)
                  return (
                    <tr
                      key={coupon.id}
                      className={cn(
                        'group transition-colors',
                        expired ? 'bg-surface-container-low/40' : 'hover:bg-surface-container-low',
                        idx !== coupons.length - 1 ? 'border-b-2 border-table-border' : ''
                      )}
                    >
                      {/* Code */}
                      <td className="py-4 px-5 border-r border-table-border">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 bg-primary/5 text-primary border-2 border-primary/20 rounded-lg font-mono font-black text-xs tracking-widest">
                            {coupon.code}
                          </span>
                          {expired && (
                            <span className="px-2.5 py-1 border-2 border-error text-error rounded-lg font-black text-[10px] uppercase tracking-widest">
                              Expired
                            </span>
                          )}
                        </div>
                        {coupon.description && (
                          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-1 max-w-[200px] truncate">
                            {coupon.description}
                          </p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-4 px-5 border-r border-table-border">
                        <span className={cn(
                          'px-2.5 py-1 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest',
                          coupon.discount_type === 'percentage'
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-green-50 text-green-600 border-green-200',
                        )}>
                          {coupon.discount_type === 'percentage' ? 'Percentage' : 'Flat'}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="py-4 px-5 border-r border-table-border font-black text-sm text-primary">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : `₹${coupon.discount_value}`}
                      </td>

                      {/* Min order */}
                      <td className="py-4 px-5 border-r border-table-border font-bold text-sm text-on-surface-variant">
                        {coupon.min_order_value ? `₹${coupon.min_order_value}` : '—'}
                      </td>

                      {/* Cap */}
                      <td className="py-4 px-5 border-r border-table-border font-bold text-sm text-on-surface-variant">
                        {coupon.max_discount ? `₹${coupon.max_discount}` : '—'}
                      </td>

                      {/* Usage */}
                      <td className="py-4 px-5 border-r border-table-border">
                        <div className="space-y-2">
                          <p className="font-black text-xs text-primary">
                            {coupon.uses_count}
                            {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                          </p>
                          {pct !== null && (
                            <div className="w-20 h-2 border-2 border-table-border bg-surface rounded-full overflow-hidden">
                              <div
                                className={cn('h-full', pct >= 90 ? 'bg-error' : pct >= 70 ? 'bg-amber-500' : 'bg-primary')}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Valid until */}
                      <td className={cn('py-4 px-5 border-r border-table-border font-bold text-sm', expired ? 'text-error' : 'text-on-surface-variant')}>
                        {formatDate(coupon.valid_until)}
                      </td>

                      {/* Active toggle */}
                      <td className="py-4 px-5 border-r border-table-border text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={coupon.is_active}
                          disabled={!!saving[coupon.id]}
                          onClick={() => toggleActive(coupon.id, coupon.is_active)}
                          className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors disabled:opacity-50 active:scale-95 mx-auto',
                            coupon.is_active ? 'bg-primary border-primary' : 'bg-surface border-table-border',
                          )}
                        >
                          <span className={cn(
                            'inline-block h-3.5 w-3.5 rounded-full shadow transition-transform',
                            coupon.is_active ? 'translate-x-5 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50',
                          )} />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/admin/coupons/${coupon.id}`}
                            title="Edit"
                            className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all active:scale-95"
                          >
                            <Edit3 size={16} strokeWidth={2.5} />
                          </Link>
                          <button
                            onClick={() => deleteCoupon(coupon.id, coupon.code)}
                            disabled={deleting === coupon.id}
                            title="Delete"
                            className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition-all disabled:opacity-40 active:scale-95"
                          >
                            {deleting === coupon.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} strokeWidth={2.5} />}
                          </button>
                        </div>
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
