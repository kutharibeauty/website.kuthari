'use client'

import { ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { PAGE_SIZE_OPTIONS } from '@/hooks/usePagination'

/** Rows-per-page dropdown (10 / 25 / 50 / 100), for the filter row. */
export function PageSizeSelect({
  pageSize,
  onChange,
}: {
  pageSize: number
  onChange: (n: number) => void
}) {
  return (
    <div className="relative">
      <select
        value={pageSize}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="pl-4 pr-10 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary focus:outline-none focus:border-primary transition-colors appearance-none"
        aria-label="Rows per page"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>{n} / page</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-primary opacity-50">
        <ChevronsUpDown size={16} />
      </div>
    </div>
  )
}

/**
 * "Showing A–B of N" + Prev / Page X of Y / Next. Render OUTSIDE the table's
 * horizontal-scroll container so it's reachable without scrolling sideways.
 */
export function TablePagination({
  total,
  currentPage,
  totalPages,
  pageStart,
  pageSize,
  onPage,
}: {
  total: number
  currentPage: number
  totalPages: number
  pageStart: number
  pageSize: number
  onPage: (page: number) => void
}) {
  if (total === 0) return null
  const btn =
    'flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-table-border font-black text-[10px] uppercase tracking-widest text-primary hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t-2 border-table-border">
      <p className="font-bold text-[11px] uppercase tracking-widest text-on-surface-variant">
        Showing {pageStart + 1}–{Math.min(pageStart + pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button onClick={() => onPage(currentPage - 1)} disabled={currentPage <= 1} className={btn}>
          <ChevronLeft size={15} /> Prev
        </button>
        <span className="font-black text-[11px] uppercase tracking-widest text-on-surface-variant px-2 tabular-nums">
          Page {currentPage} / {totalPages}
        </span>
        <button onClick={() => onPage(currentPage + 1)} disabled={currentPage >= totalPages} className={btn}>
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
