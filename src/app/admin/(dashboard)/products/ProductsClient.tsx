'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { Product } from '@/types/database.types'
import {
  Upload, Download, Plus, Search, Star, X, CheckSquare, Square,
  ArrowUp, ArrowDown, ChevronsUpDown, Edit3, MessageCircleQuestion, MessageSquare, Image as ImageIcon,
  ChevronLeft, ChevronRight
} from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

type SortField = 'name' | 'price' | 'stock_qty' | 'created_at'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'
type StockFilter = 'all' | 'in_stock' | 'out_of_stock'

/** The URL param if it's one of the allowed values, else the fallback. */
function paramOr<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export default function ProductsClient({
  initialProducts,
  categories,
}: {
  initialProducts: Product[]
  categories: { id: string; name: string }[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState(initialProducts)
  // Filters / sort / pagination are seeded from the URL so returning here (e.g.
  // after editing a product) restores the exact view, and the URL stays
  // shareable/bookmarkable. They're mirrored back to the URL in an effect below.
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get('category') ?? 'all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => paramOr(searchParams.get('status'), ['all', 'active', 'inactive'] as const, 'all'))
  const [stockFilter, setStockFilter] = useState<StockFilter>(() => paramOr(searchParams.get('stock'), ['all', 'in_stock', 'out_of_stock'] as const, 'all'))
  const [featuredOnly, setFeaturedOnly] = useState(() => searchParams.get('featured') === '1')
  const [sortField, setSortField] = useState<SortField>(() => paramOr(searchParams.get('sort'), ['name', 'price', 'stock_qty', 'created_at'] as const, 'created_at'))
  const [sortDir, setSortDir] = useState<SortDir>(() => (searchParams.get('dir') === 'asc' ? 'asc' : 'desc'))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [stockDraft, setStockDraft] = useState('')
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [priceDraft, setPriceDraft] = useState('')
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)
  // Pagination — default 10 per page so the admin sees a short table instead of
  // scrolling a long one to reach the sideways scrollbar. Page size is
  // adjustable (10/25/50/100).
  const [pageSize, setPageSize] = useState(() => {
    const n = Number(searchParams.get('size'))
    return PAGE_SIZE_OPTIONS.includes(n) ? n : 10
  })
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1))
  const importRef = useRef<HTMLInputElement>(null)
  const showToast = useToastStore((s) => s.show)

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map(c => [c.id, c.name])),
    [categories],
  )

  const filtered = useMemo(() => {
    let list = [...products]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q),
      )
    }
    if (categoryFilter !== 'all') list = list.filter(p => p.category_id === categoryFilter)
    if (statusFilter === 'active') list = list.filter(p => p.is_active)
    if (statusFilter === 'inactive') list = list.filter(p => !p.is_active)
    if (stockFilter === 'in_stock') list = list.filter(p => p.stock_qty > 0)
    if (stockFilter === 'out_of_stock') list = list.filter(p => p.stock_qty === 0)
    if (featuredOnly) list = list.filter(p => p.is_featured)

    list.sort((a, b) => {
      const av = a[sortField] as string | number
      const bv = b[sortField] as string | number
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [products, search, categoryFilter, statusFilter, stockFilter, featuredOnly, sortField, sortDir])

  // A changed filter/search/page-size can leave you on a page that no longer
  // exists — jump back to the first page whenever the result set changes. Skip
  // the initial run so a page seeded from the URL isn't wiped on mount.
  const didMountPageReset = useRef(false)
  useEffect(() => {
    if (!didMountPageReset.current) { didMountPageReset.current = true; return }
    setPage(1)
  }, [search, categoryFilter, statusFilter, stockFilter, featuredOnly, pageSize])

  // Current page, clamped so it can never point past the end of the results.
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const paged = filtered.slice(pageStart, pageStart + pageSize)

  // Mirror the current view into the URL — debounced, and via replaceState so it
  // doesn't spam browser history or re-fetch the (dynamic) page. Only non-default
  // values are written, keeping the URL clean. Restored automatically on return
  // because the state above seeds from these same params.
  useEffect(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (categoryFilter !== 'all') params.set('category', categoryFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (stockFilter !== 'all') params.set('stock', stockFilter)
    if (featuredOnly) params.set('featured', '1')
    if (sortField !== 'created_at') params.set('sort', sortField)
    if (sortDir !== 'desc') params.set('dir', sortDir)
    if (pageSize !== 10) params.set('size', String(pageSize))
    if (currentPage > 1) params.set('page', String(currentPage))
    const qs = params.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    const handle = setTimeout(() => {
      window.history.replaceState(window.history.state, '', url)
    }, 300)
    return () => clearTimeout(handle)
  }, [search, categoryFilter, statusFilter, stockFilter, featuredOnly, sortField, sortDir, pageSize, currentPage, pathname])

  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))
  const someSelected = selectedIds.size > 0

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map(p => p.id)))
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function patchProduct(id: string, data: Partial<Product>) {
    setSaving(prev => ({ ...prev, [id]: true }))
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
      showToast('Changes saved successfully', 'success')
    } else {
      showToast('Failed to save changes', 'error')
    }
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  async function saveStock(id: string) {
    const qty = parseInt(stockDraft, 10)
    if (!isNaN(qty) && qty >= 0) await patchProduct(id, { stock_qty: qty })
    setEditingStockId(null)
  }

  async function savePrice(id: string) {
    const price = parseFloat(priceDraft)
    const current = products.find(p => p.id === id)?.price
    // Only write when it's a valid, non-negative number that actually changed —
    // avoids a needless PATCH (and a spurious price_updated_at bump) on blur.
    if (!isNaN(price) && price >= 0 && price !== current) {
      await patchProduct(id, { price })
    }
    setEditingPriceId(null)
  }

  async function bulkAction(action: 'activate' | 'deactivate' | 'delete') {
    const ids = [...selectedIds]
    if (action === 'delete' && !confirm(`Permanently delete ${ids.length} product(s)?`)) return

    const res = await fetch('/api/products/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ids }),
    })

    if (res.ok) {
      if (action === 'delete') {
        setProducts(prev => prev.filter(p => !selectedIds.has(p.id)))
        showToast(`${ids.length} product${ids.length !== 1 ? 's' : ''} deleted`, 'success')
      } else {
        const isActive = action === 'activate'
        setProducts(prev =>
          prev.map(p => selectedIds.has(p.id) ? { ...p, is_active: isActive } : p),
        )
        showToast('Changes saved successfully', 'success')
      }
      setSelectedIds(new Set())
    } else {
      showToast('Bulk action failed', 'error')
    }
  }

  function exportCSV() {
    const headers = ['SKU', 'Name', 'Category', 'Price', 'MRP', 'Unit', 'Stock', 'Featured', 'Active', 'Created']
    const rows = filtered.map(p => [
      p.sku ?? '',
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(categoryMap[p.category_id ?? ''] ?? '').replace(/"/g, '""')}"`,
      p.price,
      p.mrp ?? '',
      p.unit,
      p.stock_qty,
      p.is_featured ? 'Yes' : 'No',
      p.is_active ? 'Yes' : 'No',
      new Date(p.created_at).toLocaleDateString('en-IN'),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `bcr-products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/products/bulk-import', { method: 'POST', body: form })
    if (res.ok) {
      const d = await res.json().catch(() => ({})) as { created?: number; images_matched?: number; failed?: number }
      const parts = [`${d.created ?? 0} products imported`]
      if (d.images_matched) parts.push(`${d.images_matched} images auto-matched`)
      if (d.failed) parts.push(`${d.failed} rows failed`)
      showToast(parts.join(' · '), d.failed ? 'error' : 'success')
      window.location.reload()
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      showToast(d.error ?? 'Failed to import products', 'error')
    }
    setImporting(false)
    if (importRef.current) importRef.current.value = ''
  }

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">
            Products.
          </h1>
          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mt-1">
            {products.length} total · {filtered.length} shown
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-card border-2 border-table-border text-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-primary/40 transition-colors disabled:opacity-50 active:scale-95"
          >
            <Upload size={16} strokeWidth={2.5} />
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-card border-2 border-table-border text-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-primary/40 transition-colors active:scale-95"
          >
            <Download size={16} strokeWidth={2.5} />
            Export CSV
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Product
          </Link>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center bg-surface-card border-2 border-table-border p-4 rounded-2xl">
        <div className="relative min-w-[220px] flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" />
          <input
            type="text"
            placeholder="Search name or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary placeholder:font-medium placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="relative">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="pl-4 pr-10 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary focus:outline-none focus:border-primary transition-colors appearance-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-primary opacity-50">
            <ChevronsUpDown size={16} />
          </div>
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="pl-4 pr-10 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary focus:outline-none focus:border-primary transition-colors appearance-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-primary opacity-50">
            <ChevronsUpDown size={16} />
          </div>
        </div>

        <div className="relative">
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value as StockFilter)}
            className="pl-4 pr-10 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary focus:outline-none focus:border-primary transition-colors appearance-none"
          >
            <option value="all">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-primary opacity-50">
            <ChevronsUpDown size={16} />
          </div>
        </div>

        <button
          onClick={() => setFeaturedOnly(v => !v)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-widest',
            featuredOnly
              ? 'bg-primary border-primary text-white shadow-md'
              : 'bg-surface border-table-border text-on-surface-variant hover:border-primary/40 hover:text-primary',
          )}
        >
          <Star size={16} fill={featuredOnly ? 'currentColor' : 'none'} strokeWidth={2.5} />
          Featured
        </button>

        {/* Products per page */}
        <div className="relative">
          <select
            value={pageSize}
            onChange={e => setPageSize(parseInt(e.target.value, 10))}
            className="pl-4 pr-10 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary focus:outline-none focus:border-primary transition-colors appearance-none"
            aria-label="Products per page"
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-primary opacity-50">
            <ChevronsUpDown size={16} />
          </div>
        </div>
      </div>

      {/* ── Bulk Actions Bar ── */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-primary text-white rounded-2xl border-2 border-primary shadow-lg animate-in slide-in-from-bottom-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
          <p className="font-black text-sm uppercase tracking-widest flex-1 relative z-10">
            {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2 relative z-10">
            <button
              onClick={() => bulkAction('activate')}
              className="px-4 py-2 border-2 border-white/20 bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-primary transition-colors"
            >
              Activate
            </button>
            <button
              onClick={() => bulkAction('deactivate')}
              className="px-4 py-2 border-2 border-white/20 bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-primary transition-colors"
            >
              Deactivate
            </button>
            <button
              onClick={() => bulkAction('delete')}
              className="px-4 py-2 border-2 border-error/50 bg-error/20 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-error hover:text-white transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-2 border-2 border-white/20 bg-white/10 text-white rounded-xl hover:bg-white hover:text-primary transition-colors"
              aria-label="Clear selection"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-surface-card rounded-2xl border-2 border-table-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-primary">
                <th className="py-4 px-4 w-12 border-r border-white/10">
                  <button onClick={toggleSelectAll} className="text-white/70 hover:text-white transition-colors">
                    {allSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                </th>
                <th className="py-4 px-5 w-16 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10">
                  Image
                </th>
                <th className="py-4 px-5 border-r border-white/10">
                  <SortBtn label="SKU" field="name" current={sortField} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-4 px-5 border-r border-white/10">
                  <SortBtn label="Name" field="name" current={sortField} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10">
                  Category
                </th>
                <th className="py-4 px-5 border-r border-white/10">
                  <SortBtn label="Price" field="price" current={sortField} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10">
                  Unit
                </th>
                <th className="py-4 px-5 border-r border-white/10">
                  <SortBtn label="Stock" field="stock_qty" current={sortField} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10">
                  Featured
                </th>
                <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10">
                  Active
                </th>
                <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-24 text-center">
                    <p className="font-black text-sm uppercase tracking-widest text-on-surface-variant">
                      No products match your filters.
                    </p>
                  </td>
                </tr>
              ) : paged.map((product, idx) => (
                <tr
                  key={product.id}
                  className={cn(
                    'transition-colors group',
                    idx !== paged.length - 1 ? 'border-b-2 border-table-border' : '',
                    selectedIds.has(product.id)
                      ? 'bg-primary/5'
                      : 'hover:bg-surface-container-low',
                  )}
                >
                  {/* Checkbox */}
                  <td className="py-4 px-4 border-r border-table-border text-center">
                    <button onClick={() => toggleSelect(product.id)} className={cn(
                      "transition-colors",
                      selectedIds.has(product.id) ? "text-primary" : "text-on-surface-variant/40 group-hover:text-primary/60"
                    )}>
                      {selectedIds.has(product.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </td>

                  {/* Image */}
                  <td className="py-4 px-5 border-r border-table-border">
                    {product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0]}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover border-2 border-table-border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-surface border-2 border-table-border flex items-center justify-center">
                        <ImageIcon size={20} className="text-on-surface-variant/40" />
                      </div>
                    )}
                  </td>

                  {/* SKU */}
                  <td className="py-4 px-5 border-r border-table-border font-black text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {product.sku ?? '—'}
                  </td>

                  {/* Name */}
                  <td className="py-4 px-5 border-r border-table-border max-w-[260px] whitespace-normal align-top">
                    <p className="font-bold text-sm text-primary break-words" title={product.name}>
                      {product.name}
                    </p>
                  </td>

                  {/* Category */}
                  <td className="py-4 px-5 border-r border-table-border font-bold text-xs text-on-surface-variant">
                    {categoryMap[product.category_id ?? ''] ?? '—'}
                  </td>

                  {/* Price (inline edit) */}
                  <td className="py-4 px-5 border-r border-table-border">
                    {editingPriceId === product.id ? (
                      <div className="flex items-center gap-1">
                        <span className="font-black text-sm text-primary">₹</span>
                        <input
                          type="number"
                          value={priceDraft}
                          autoFocus
                          min={0}
                          step="0.01"
                          onChange={e => setPriceDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') savePrice(product.id)
                            if (e.key === 'Escape') setEditingPriceId(null)
                          }}
                          onBlur={() => savePrice(product.id)}
                          className="w-24 px-3 py-1.5 border-2 border-primary rounded-lg font-black text-sm text-primary focus:outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPriceId(product.id)
                          setPriceDraft(product.price.toString())
                        }}
                        title="Click to edit price"
                        className="font-black text-sm text-primary px-3 py-1.5 -mx-3 rounded-lg border-2 border-transparent hover:border-primary/40 hover:bg-surface transition-colors active:scale-95"
                      >
                        {saving[product.id] ? '…' : `₹${product.price.toLocaleString('en-IN')}`}
                      </button>
                    )}
                    {product.mrp && <p className="font-bold text-[10px] text-on-surface-variant line-through mt-0.5">₹{product.mrp}</p>}
                  </td>

                  {/* Unit */}
                  <td className="py-4 px-5 border-r border-table-border font-bold text-xs text-on-surface-variant">
                    {product.unit}
                  </td>

                  {/* Stock (inline edit) */}
                  <td className="py-4 px-5 border-r border-table-border">
                    {editingStockId === product.id ? (
                      <input
                        type="number"
                        value={stockDraft}
                        autoFocus
                        min={0}
                        onChange={e => setStockDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveStock(product.id)
                          if (e.key === 'Escape') setEditingStockId(null)
                        }}
                        onBlur={() => saveStock(product.id)}
                        className="w-20 px-3 py-1.5 border-2 border-primary rounded-lg font-black text-sm text-primary focus:outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditingStockId(product.id)
                          setStockDraft(product.stock_qty.toString())
                        }}
                        title="Click to edit stock"
                        className={cn(
                          'font-black text-sm px-3 py-1.5 rounded-lg border-2 transition-colors active:scale-95',
                          product.stock_qty === 0
                            ? 'bg-error/10 border-error/30 text-error hover:border-error'
                            : product.stock_qty < 10
                              ? 'bg-amber-100/50 border-amber-300 text-amber-700 hover:border-amber-500'
                              : 'bg-surface border-table-border text-primary hover:border-primary/40',
                        )}
                      >
                        {saving[product.id] ? '…' : product.stock_qty}
                      </button>
                    )}
                  </td>

                  {/* Featured toggle */}
                  <td className="py-4 px-5 border-r border-table-border text-center">
                    <Toggle
                      checked={product.is_featured}
                      disabled={!!saving[product.id]}
                      onChange={() => patchProduct(product.id, { is_featured: !product.is_featured })}
                    />
                  </td>

                  {/* Active toggle */}
                  <td className="py-4 px-5 border-r border-table-border text-center">
                    <Toggle
                      checked={product.is_active}
                      disabled={!!saving[product.id]}
                      onChange={() => patchProduct(product.id, { is_active: !product.is_active })}
                    />
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        title="Edit product"
                        className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all active:scale-95"
                      >
                        <Edit3 size={16} strokeWidth={2.5} />
                      </Link>
                      <Link
                        href={`/admin/products/${product.id}/faq`}
                        title="Manage FAQs"
                        className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all active:scale-95"
                      >
                        <MessageCircleQuestion size={16} strokeWidth={2.5} />
                      </Link>
                      <Link
                        href={`/admin/products/${product.id}/reviews`}
                        title="Manage reviews"
                        className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all active:scale-95"
                      >
                        <MessageSquare size={16} strokeWidth={2.5} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — outside the horizontal-scroll area so Prev/Next stay put
            without scrolling the wide table sideways first. */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t-2 border-table-border">
            <p className="font-bold text-[11px] uppercase tracking-widest text-on-surface-variant">
              Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-table-border font-black text-[10px] uppercase tracking-widest text-primary hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95"
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <span className="font-black text-[11px] uppercase tracking-widest text-on-surface-variant px-2 tabular-nums">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-table-border font-black text-[10px] uppercase tracking-widest text-primary hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  checked, disabled, onChange,
}: { checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 transition-colors focus-visible:outline-none disabled:opacity-50 active:scale-95',
        checked ? 'bg-primary border-primary' : 'bg-surface border-table-border',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full shadow-sm transition-transform',
          checked ? 'translate-x-5 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50',
        )}
      />
    </button>
  )
}

// ── Sort button ───────────────────────────────────────────────────────────────

function SortBtn({
  label, field, current, dir, onSort,
}: {
  label: string
  field: SortField
  current: SortField
  dir: SortDir
  onSort: (f: SortField) => void
}) {
  const active = current === field
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1.5 font-black text-[10px] uppercase tracking-[0.2em] transition-colors',
        active ? 'text-white' : 'text-white/70 hover:text-white',
      )}
    >
      {label}
      {active ? (
        dir === 'asc' ? <ArrowUp size={14} strokeWidth={3} /> : <ArrowDown size={14} strokeWidth={3} />
      ) : (
        <ChevronsUpDown size={14} className="opacity-50" />
      )}
    </button>
  )
}
