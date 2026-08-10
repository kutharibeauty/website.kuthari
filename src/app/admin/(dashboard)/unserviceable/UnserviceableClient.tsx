'use client'

import { useState } from 'react'
import { Download, Check, MessageSquare, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import { usePagination } from '@/hooks/usePagination'
import { PageSizeSelect, TablePagination } from '@/components/admin/TablePagination'
import type { UnserviceableAttempt } from './page'

interface Props { initialRows: UnserviceableAttempt[] }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function UnserviceableClient({ initialRows }: Props) {
  const [rows, setRows] = useState<UnserviceableAttempt[]>(initialRows)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [filterContacted, setFilterContacted] = useState<'all' | 'yes' | 'no'>('all')
  const showToast = useToastStore((s) => s.show)

  const filtered = rows.filter((r) => {
    if (filterContacted === 'yes' && !r.is_contacted) return false
    if (filterContacted === 'no' && r.is_contacted) return false
    return true
  })

  const { paged, setPage, pageSize, setPageSize, totalPages, currentPage, pageStart } =
    usePagination(filtered, filterContacted)

  const markContacted = async (row: UnserviceableAttempt) => {
    const res = await fetch(`/api/unserviceable/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_contacted: true }),
    })
    if (res.ok) {
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, is_contacted: true } : r))
      showToast('Marked as contacted', 'success')
    } else {
      showToast('Failed to update', 'error')
    }
  }

  const saveNote = async (id: string) => {
    const res = await fetch(`/api/unserviceable/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: noteText }),
    })
    if (res.ok) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, notes: noteText } : r))
      setEditingNote(null)
      showToast('Changes saved successfully', 'success')
    } else {
      showToast('Failed to save note', 'error')
    }
  }

  const exportCSV = () => {
    const header = 'Date,Customer,Phone,Pincode,City,Cart Value,Contacted,Notes'
    const csvRows = rows.map((r) =>
      `${formatDate(r.created_at)},${r.customer_name ?? '—'},${r.phone ?? '—'},${r.pincode},${r.city ?? '—'},₹${r.cart_value ?? 0},${r.is_contacted ? 'Yes' : 'No'},"${r.notes ?? ''}"`
    ).join('\n')
    const blob = new Blob([header + '\n' + csvRows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'unserviceable.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">Unserviceable.</h1>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">
            {rows.filter((r) => !r.is_contacted).length} pending contact · {rows.length} total attempts
          </p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors active:scale-95 shadow-sm">
          <Download size={16} strokeWidth={2.5} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-table-border pb-2">
        {(['all', 'no', 'yes'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilterContacted(v)}
            className={cn('px-6 py-3 font-black text-xs uppercase tracking-widest transition-all rounded-xl', filterContacted === v ? 'bg-primary text-white border-2 border-primary shadow-sm' : 'bg-surface text-on-surface-variant border-2 border-transparent hover:border-table-border hover:bg-surface-card active:scale-95')}
          >
            {v === 'all' ? 'All' : v === 'no' ? 'Pending' : 'Contacted'}
          </button>
        ))}
        <div className="ml-auto">
          <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-card rounded-2xl border-2 border-table-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                {['Date', 'Customer', 'Phone', 'Pincode', 'City', 'Cart Value', 'Status', 'Notes', 'Actions'].map((h, i) => (
                  <th key={h} className={cn("px-5 py-4 font-black text-[10px] uppercase tracking-[0.2em] text-white/70", i < 8 ? "border-r border-white/10" : "", h === "Actions" || h === "Status" ? "text-center" : "")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-24 text-center font-black text-sm text-on-surface-variant uppercase tracking-widest">No records found.</td></tr>
              ) : paged.map((row, idx) => (
                <tr key={row.id} className={cn("hover:bg-surface-container-low transition-colors group", idx !== paged.length - 1 ? 'border-b-2 border-table-border' : '')}>
                  <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface-variant">{formatDate(row.created_at)}</td>
                  <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface">{row.customer_name ?? '—'}</td>
                  <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface-variant">{row.phone ?? '—'}</td>
                  <td className="px-5 py-4 border-r border-table-border font-mono font-black text-xs text-primary tracking-widest">{row.pincode}</td>
                  <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface-variant">{row.city ?? '—'}</td>
                  <td className="px-5 py-4 border-r border-table-border font-black text-sm text-primary">₹{row.cart_value?.toFixed(0) ?? '0'}</td>
                  <td className="px-5 py-4 border-r border-table-border text-center">
                    {row.is_contacted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-green-200 bg-green-50 text-green-700 font-black text-[10px] uppercase tracking-widest">
                        <Check size={12} strokeWidth={3} /> Contacted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-error/20 bg-error/10 text-error font-black text-[10px] uppercase tracking-widest">
                        <AlertCircle size={12} strokeWidth={3} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 border-r border-table-border min-w-[220px] max-w-[260px]">
                    {editingNote === row.id ? (
                      <div className="flex items-stretch gap-2">
                        <input
                          autoFocus
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2 text-sm font-bold border-2 border-table-border rounded-lg bg-surface focus:outline-none focus:border-primary"
                          onKeyDown={(e) => { if (e.key === 'Enter') saveNote(row.id); if (e.key === 'Escape') setEditingNote(null) }}
                        />
                        <button onClick={() => saveNote(row.id)} className="flex-shrink-0 whitespace-nowrap px-3.5 py-2 rounded-lg bg-primary text-white font-black text-[10px] uppercase tracking-widest active:scale-95 hover:bg-primary/90 transition-colors">Save</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingNote(row.id); setNoteText(row.notes ?? '') }}
                        className="text-left font-bold text-sm text-on-surface-variant hover:text-primary transition-colors truncate w-full"
                      >
                        {row.notes ? row.notes : <span className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest opacity-50"><MessageSquare size={14} />Add note</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {!row.is_contacted ? (
                      <button
                        onClick={() => markContacted(row)}
                        className="px-4 py-2 rounded-xl border-2 border-table-border bg-surface text-primary font-black text-[10px] uppercase tracking-widest hover:border-primary/40 transition-all active:scale-95 whitespace-nowrap"
                      >
                        Mark Contacted
                      </button>
                    ) : (
                       <span className="font-bold text-sm text-on-surface-variant/50">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination total={filtered.length} currentPage={currentPage} totalPages={totalPages} pageStart={pageStart} pageSize={pageSize} onPage={setPage} />
      </div>
    </div>
  )
}
