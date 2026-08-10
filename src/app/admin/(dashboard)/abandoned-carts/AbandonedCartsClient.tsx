'use client'

import { useState } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { PageSizeSelect, TablePagination } from '@/components/admin/TablePagination'
import { X, Download, ShoppingCart, Eye, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AbandonedCart } from './page'

interface Props { initialCarts: AbandonedCart[] }

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export default function AbandonedCartsClient({ initialCarts }: Props) {
  const [carts] = useState<AbandonedCart[]>(initialCarts)
  const [selected, setSelected] = useState<AbandonedCart | null>(null)
  const [minValue, setMinValue] = useState('')
  const [showRecovered, setShowRecovered] = useState<'all' | 'yes' | 'no'>('all')

  const filtered = carts.filter((c) => {
    if (minValue && c.total_value < Number(minValue)) return false
    if (showRecovered === 'yes' && !c.is_recovered) return false
    if (showRecovered === 'no' && c.is_recovered) return false
    return true
  })

  const { paged, setPage, pageSize, setPageSize, totalPages, currentPage, pageStart } =
    usePagination(filtered, `${minValue}|${showRecovered}`)

  const exportCSV = () => {
    const header = 'Customer,Phone,Items,Cart Value,Last Activity,Recovered'
    const rows = filtered.map((c) =>
      `${c.customer_name ?? '—'},${c.phone ?? '—'},"${c.items.map((i) => `${i.name}×${i.quantity}`).join('; ')}",₹${c.total_value},${formatDate(c.last_activity)},${c.is_recovered ? 'Yes' : 'No'}`
    ).join('\n')
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'abandoned-carts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">
            Abandoned Carts.
          </h1>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">
            {carts.filter((c) => !c.is_recovered).length} active · {carts.filter((c) => c.is_recovered).length} recovered
          </p>
        </div>
        <button onClick={exportCSV} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors active:scale-95 shadow-sm">
          <Download size={16} strokeWidth={2.5} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center border-b-2 border-table-border pb-4">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide">
          {(['all', 'no', 'yes'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setShowRecovered(v)}
              className={cn('px-6 py-3 font-black text-[10px] uppercase tracking-widest transition-all rounded-xl whitespace-nowrap', showRecovered === v ? 'bg-primary text-white border-2 border-primary shadow-sm' : 'bg-surface text-on-surface-variant border-2 border-transparent hover:border-table-border hover:bg-surface-card active:scale-95')}
            >
              {v === 'all' ? 'All' : v === 'no' ? 'Active' : 'Recovered'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Min value</span>
          <div className="relative flex-1 sm:w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-primary">₹</span>
            <input
              type="number"
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-table-border bg-surface font-black text-xs text-primary focus:outline-none focus:border-primary font-mono transition-colors"
            />
          </div>
        </div>
        <div className="sm:ml-auto">
          <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-card rounded-2xl border-2 border-table-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                {['Customer', 'Phone', 'Items', 'Cart Value', 'Last Activity', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} className={cn("px-5 py-4 font-black text-[10px] uppercase tracking-[0.2em] text-white/70", i < 6 ? "border-r border-white/10" : "", h === "Actions" || h === "Status" ? "text-center" : "")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-24 text-center">
                     <ShoppingCart size={32} className="mx-auto text-on-surface-variant/40 mb-4" />
                     <p className="font-black text-sm text-on-surface-variant uppercase tracking-widest">No carts found.</p>
                  </td>
                </tr>
              ) : paged.map((cart, idx) => (
                <tr key={cart.id} className={cn("hover:bg-surface-container-low transition-colors group", idx !== paged.length - 1 ? 'border-b-2 border-table-border' : '')}>
                  <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-primary">{cart.customer_name ?? '—'}</td>
                  <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface-variant">{cart.phone ?? '—'}</td>
                  <td className="px-5 py-4 border-r border-table-border font-black text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {cart.item_count} {cart.item_count === 1 ? 'item' : 'items'}
                  </td>
                  <td className="px-5 py-4 border-r border-table-border font-black text-sm text-primary">₹{cart.total_value.toFixed(0)}</td>
                  <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface-variant">{formatDate(cart.last_activity)}</td>
                  <td className="px-5 py-4 border-r border-table-border text-center">
                    {cart.is_recovered ? (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-green-200 bg-green-50 text-green-700 font-black text-[10px] uppercase tracking-widest">
                        <Check size={12} strokeWidth={3} /> Recovered
                      </span>
                    ) : (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-error/20 bg-error/10 text-error font-black text-[10px] uppercase tracking-widest">
                        <AlertCircle size={12} strokeWidth={3} /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => setSelected(cart)} className="p-2.5 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all active:scale-95">
                      <Eye size={16} strokeWidth={2.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination total={filtered.length} currentPage={currentPage} totalPages={totalPages} pageStart={pageStart} pageSize={pageSize} onPage={setPage} />
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-surface-card rounded-2xl border-2 border-table-border shadow-xl overflow-hidden flex flex-col max-h-[90dvh]">
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-table-border bg-surface">
              <h3 className="font-black text-xl text-primary">Cart Details.</h3>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl border-2 border-table-border hover:bg-surface-card transition-colors active:scale-95">
                <X size={16} strokeWidth={2.5} className="text-on-surface-variant" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-4 rounded-xl border-2 border-table-border">
                  <span className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest block mb-1">Customer</span>
                  <p className="font-bold text-sm text-primary truncate">{selected.customer_name ?? '—'}</p>
                </div>
                <div className="bg-surface p-4 rounded-xl border-2 border-table-border">
                  <span className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest block mb-1">Phone</span>
                  <p className="font-bold text-sm text-primary truncate">{selected.phone ?? '—'}</p>
                </div>
                <div className="bg-surface p-4 rounded-xl border-2 border-table-border">
                  <span className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest block mb-1">Total Value</span>
                  <p className="font-black text-sm text-primary truncate">₹{selected.total_value.toFixed(0)}</p>
                </div>
                <div className="bg-surface p-4 rounded-xl border-2 border-table-border">
                  <span className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest block mb-1">Last Activity</span>
                  <p className="font-bold text-sm text-primary truncate">{formatDate(selected.last_activity)}</p>
                </div>
              </div>

              <div>
                <p className="font-black text-xs text-primary uppercase tracking-widest mb-3 border-b-2 border-table-border pb-2">Items</p>
                <div className="space-y-3">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-surface p-4 rounded-xl border-2 border-table-border">
                      <div className="min-w-0 flex-1 pr-4">
                        <span className="font-bold text-sm text-primary block truncate">{item.name}</span>
                        <span className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest block mt-0.5">{item.unit}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest block mb-0.5">×{item.quantity}</span>
                        <span className="font-black text-sm text-primary">₹{(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
