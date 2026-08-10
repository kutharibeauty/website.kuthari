'use client'

import { useState, useRef } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { PageSizeSelect, TablePagination } from '@/components/admin/TablePagination'

type AreaOption = {
  area: string
  pincode: string
  city: string | null
  state: string
  /** H.O. / S.O. / B.O. — place names repeat, so this tells them apart. */
  office_type?: string | null
}
import { Loader2, Search, Download, Plus, Trash2, List, Map, Upload, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { PincodeRow } from './page'

const inputCls = 'w-full px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary placeholder:font-medium placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors'

interface Props { initialRows: PincodeRow[] }

export default function PincodesClient({ initialRows }: Props) {
  const [rows, setRows] = useState<PincodeRow[]>(initialRows)
  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({ pincode: '', area_name: '', city: '', state: '', delivery_days: '2' })
  const [detecting, setDetecting] = useState(false)
  const [pinNotice, setPinNotice] = useState('')
  const [areaOptions, setAreaOptions] = useState<AreaOption[]>([])

  // Pincode → area / city / state, scoped to Ganjam district. If the pincode is
  // outside Ganjam we say so instead of filling it.
  async function detectByPincode(pincode: string) {
    setDetecting(true); setPinNotice('')
    try {
      const res = await fetch(`/api/pincodes/lookup?pincode=${pincode}`)
      const d = res.ok ? (await res.json()) as {
        found?: boolean; inArea?: boolean; area?: string | null
        city?: string | null; state?: string | null; options?: AreaOption[]
      } : null
      if (d?.found && d.inArea) {
        const opts = d.options ?? []
        // City/state are the same for every office under one pincode, so fill
        // those straight away.
        setForm((f) => f.pincode === pincode ? {
          ...f,
          city: d.city ?? f.city,
          state: d.state ?? f.state,
          // A pincode here covers up to 19 areas. Only auto-fill the label when
          // there is exactly one; otherwise let the admin choose below rather
          // than silently picking the first.
          area_name: opts.length === 1 ? opts[0].area : (opts.length > 1 ? f.area_name : (d.area ?? f.area_name)),
        } : f)
        setAreaOptions(opts.length > 1 ? opts : [])
      } else if (d?.found && d.inArea === false) {
        setAreaOptions([])
        setPinNotice('This pincode is not in Ganjam district.')
      }
    } catch { /* leave the fields for manual entry */ }
    finally { setDetecting(false) }
  }

  // Area name → pincode. One Ganjam match auto-fills the pincode; several show a
  // list to pick from. Debounced so we don't look up on every keystroke.
  const detectByArea = useDebouncedCallback(async (area: string) => {
    // 2 is enough now the directory is queried by substring locally.
    if (area.trim().length < 2) { setAreaOptions([]); return }
    try {
      const res = await fetch(`/api/pincodes/lookup?area=${encodeURIComponent(area.trim())}`)
      const d = res.ok ? (await res.json()) as { options?: AreaOption[] } : null
      const opts = d?.options ?? []
      if (opts.length === 1) {
        const o = opts[0]
        setForm((f) => ({ ...f, pincode: o.pincode, city: o.city ?? f.city, state: o.state || f.state }))
        setAreaOptions([]); setPinNotice('')
      } else {
        setAreaOptions(opts)
      }
    } catch { setAreaOptions([]) }
  }, 500)

  function pickArea(o: AreaOption) {
    setForm((f) => ({ ...f, area_name: o.area, pincode: o.pincode, city: o.city ?? f.city, state: o.state || f.state }))
    setAreaOptions([]); setPinNotice('')
  }
  const [error, setError] = useState('')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [openCities, setOpenCities] = useState<Set<string>>(new Set())
  const csvRef = useRef<HTMLInputElement>(null)
  const showToast = useToastStore((s) => s.show)

  const filtered = rows.filter((r) =>
    r.pincode.includes(search) ||
    r.city.toLowerCase().includes(search.toLowerCase()) ||
    (r.area_name ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  // Pagination for the flat list view (the map view stays grouped by city).
  const { paged, setPage, pageSize, setPageSize, totalPages, currentPage, pageStart } =
    usePagination(filtered, search)

  // Group filtered rows by city for map view
  const byCity = filtered.reduce<Record<string, PincodeRow[]>>((acc, r) => {
    const key = r.city || 'Unknown'
    ;(acc[key] ??= []).push(r)
    return acc
  }, {})
  const cityEntries = Object.entries(byCity).sort(([a], [b]) => a.localeCompare(b))

  const toggleCity = (city: string) =>
    setOpenCities((prev) => {
      const next = new Set(prev)
      next.has(city) ? next.delete(city) : next.add(city)
      return next
    })

  const expandAll = () => setOpenCities(new Set(cityEntries.map(([c]) => c)))
  const collapseAll = () => setOpenCities(new Set())

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) { setError('Enter a valid 6-digit pincode.'); return }
    if (!form.city.trim()) { setError('City is required.'); return }
    setError('')
    setIsSaving(true)
    try {
      const res = await fetch('/api/pincodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, delivery_days: Number(form.delivery_days) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRows((prev) => [data, ...prev])
      setForm({ pincode: '', area_name: '', city: '', state: '', delivery_days: '2' })
      setIsAdding(false)
      showToast('Pincode added successfully', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add pincode'
      setError(msg)
      showToast(msg, 'error')
    } finally { setIsSaving(false) }
  }

  const handleToggle = async (row: PincodeRow) => {
    const res = await fetch(`/api/pincodes/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !row.is_active }),
    })
    if (res.ok) {
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, is_active: !r.is_active } : r))
      showToast('Changes saved successfully', 'success')
    } else {
      showToast('Failed to save changes', 'error')
    }
  }

  const handleDelete = async (row: PincodeRow) => {
    if (!confirm(`Delete pincode ${row.pincode}?`)) return
    const res = await fetch(`/api/pincodes/${row.id}`, { method: 'DELETE' })
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      showToast('Pincode deleted', 'success')
    } else {
      showToast('Failed to delete pincode', 'error')
    }
  }

  const handleBulkCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').slice(1).filter(Boolean)
    const toInsert = lines.map((line) => {
      const [pincode, area_name, city, state, delivery_days] = line.split(',').map((s) => s.trim())
      return { pincode, area_name: area_name || null, city, state: state || 'Odisha', delivery_days: Number(delivery_days) || 2 }
    }).filter((r) => /^\d{6}$/.test(r.pincode) && r.city)

    if (!toInsert.length) { alert('No valid rows found. CSV format: pincode,area_name,city,state,delivery_days'); return }

    const res = await fetch('/api/pincodes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: toInsert }),
    })
    if (res.ok) {
      const data = await res.json()
      setRows((prev) => [...data.inserted, ...prev])
      showToast(`${data.inserted?.length ?? 0} pincode(s) imported`, 'success')
    } else {
      showToast('Failed to import pincodes', 'error')
    }
    e.target.value = ''
  }

  const exportCSV = () => {
    const header = 'pincode,area_name,city,state,delivery_days,is_active'
    const csvData = rows.map((r) =>
      `${r.pincode},${r.area_name ?? ''},${r.city},${r.state},${r.delivery_days},${r.is_active}`
    ).join('\n')
    const blob = new Blob([header + '\n' + csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'pincodes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">Serviceable Pincodes.</h1>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">{rows.length} pincodes configured</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl border-2 border-table-border overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={cn('flex items-center gap-1.5 px-4 py-2 font-black text-[10px] uppercase tracking-widest transition-colors', view === 'list' ? 'bg-primary text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-card')}
            >
              <List size={14} strokeWidth={2.5} /> List
            </button>
            <button
              onClick={() => setView('map')}
              className={cn('flex items-center gap-1.5 px-4 py-2 font-black text-[10px] uppercase tracking-widest transition-colors border-l-2 border-table-border', view === 'map' ? 'bg-primary text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-card')}
            >
              <Map size={14} strokeWidth={2.5} /> By City
            </button>
          </div>
          <button onClick={() => csvRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors active:scale-95">
            <Upload size={14} strokeWidth={2.5} /> Import CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleBulkCSV} />
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors active:scale-95">
            <Download size={14} strokeWidth={2.5} /> Export CSV
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-opacity active:scale-95 shadow-sm"
          >
            <Plus size={15} strokeWidth={2.5} /> Add Pincode
          </button>
        </div>
      </div>

      {/* Add form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="bg-surface-card rounded-2xl border-2 border-table-border p-6 space-y-6">
          <h2 className="font-black text-xl text-primary">Add Pincode.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="font-black text-[10px] text-primary uppercase tracking-widest">
                Pincode <span className="text-error">*</span>
                {detecting && <span className="ml-2 font-bold text-on-surface-variant/60 normal-case tracking-normal">detecting…</span>}
              </label>
              <input
                value={form.pincode}
                onChange={(e) => {
                  const pin = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setForm((f) => ({ ...f, pincode: pin }))
                  setPinNotice('')
                  if (pin.length === 6) void detectByPincode(pin)
                }}
                placeholder="760001"
                inputMode="numeric"
                maxLength={6}
                className={inputCls}
              />
              {pinNotice && <p className="text-[10px] font-bold text-error">{pinNotice}</p>}
            </div>
            <div className="space-y-2 relative">
              <label className="font-black text-[10px] text-primary uppercase tracking-widest">
                Area Name
                <span className="ml-2 font-bold text-on-surface-variant/50 normal-case tracking-normal">type to find its pincode</span>
              </label>
              <input
                value={form.area_name}
                onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, area_name: v })); detectByArea(v) }}
                placeholder="Berhampur"
                className={inputCls}
                autoComplete="off"
              />
              {areaOptions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border-2 border-table-border bg-surface-card shadow-lg">
                  {areaOptions.map((o) => (
                    <button
                      key={`${o.area}-${o.pincode}`}
                      type="button"
                      onClick={() => pickArea(o)}
                      className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-surface-container-low border-b border-table-border last:border-0 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-sm text-primary truncate">{o.area}</span>
                        {o.office_type && (
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80 truncate">
                            {o.office_type}
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-black text-xs text-on-surface-variant tracking-widest flex-shrink-0">{o.pincode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="font-black text-[10px] text-primary uppercase tracking-widest">City <span className="text-error">*</span></label>
              <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Bhubaneswar" className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className="font-black text-[10px] text-primary uppercase tracking-widest">State</label>
              <input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="Odisha" className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className="font-black text-[10px] text-primary uppercase tracking-widest">Delivery Days</label>
              <input type="number" min={1} max={7} value={form.delivery_days} onChange={(e) => setForm((f) => ({ ...f, delivery_days: e.target.value }))} className={inputCls} />
            </div>
          </div>
          {error && <p className="font-bold text-sm text-error">{error}</p>}
          <div className="flex gap-4 pt-4 border-t-2 border-table-border">
            <button type="button" onClick={() => { setIsAdding(false); setError('') }} className="px-6 py-2.5 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant font-black text-xs uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors active:scale-95">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-opacity active:scale-95 shadow-sm">
              {isSaving && <Loader2 size={16} className="animate-spin" />} Save Pincode
            </button>
          </div>
        </form>
      )}

      {/* Search + rows per page */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-lg">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" strokeWidth={2.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pincode, city, or area…"
            className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-table-border bg-surface font-bold text-sm text-primary focus:outline-none focus:border-primary transition-colors placeholder:font-medium placeholder:italic placeholder:text-on-surface-variant/40"
          />
        </div>
        {view === 'list' && <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />}
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="bg-surface-card rounded-2xl border-2 border-table-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-primary text-white">
                  {['Pincode', 'Area', 'City', 'State', 'Days', 'Active', 'Actions'].map((h, i) => (
                    <th key={h} className={cn("py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70", i < 6 ? "border-r border-white/10" : "", h === "Actions" || h === "Active" ? "text-center" : "")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-24 text-center font-black text-sm text-on-surface-variant uppercase tracking-widest">No pincodes found.</td></tr>
                ) : (
                  paged.map((row, idx) => (
                    <PincodeTableRow key={row.id} row={row} isLast={idx === paged.length - 1} onToggle={handleToggle} onDelete={handleDelete} />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination total={filtered.length} currentPage={currentPage} totalPages={totalPages} pageStart={pageStart} pageSize={pageSize} onPage={setPage} />
        </div>
      )}

      {/* City-grouped (map) view */}
      {view === 'map' && (
        <div className="space-y-4">
          {cityEntries.length === 0 ? (
            <div className="bg-surface-card rounded-2xl border-2 border-table-border py-24 text-center">
              <p className="font-black text-sm text-on-surface-variant uppercase tracking-widest">No pincodes found.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 justify-end">
                <button onClick={expandAll} className="font-black text-[10px] uppercase tracking-widest text-primary hover:underline">Expand all</button>
                <button onClick={collapseAll} className="font-black text-[10px] uppercase tracking-widest text-on-surface-variant hover:underline">Collapse all</button>
              </div>
              {cityEntries.map(([city, cityRows]) => {
                const active = cityRows.filter((r) => r.is_active).length
                const isOpen = openCities.has(city)
                return (
                  <div key={city} className="bg-surface-card rounded-2xl border-2 border-table-border overflow-hidden">
                    <button
                      onClick={() => toggleCity(city)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 hover:bg-surface-container-low transition-colors text-left"
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        <Map size={20} className="text-primary shrink-0" strokeWidth={2.5} />
                        <span className="font-black text-lg text-primary">{city}</span>
                        <span className="font-black text-[10px] uppercase tracking-widest text-primary bg-primary/10 border-2 border-primary/20 px-3 py-1 rounded-lg">
                          {cityRows.length} pincode{cityRows.length !== 1 ? 's' : ''}
                        </span>
                        {active < cityRows.length && (
                          <span className="font-black text-[10px] uppercase tracking-widest text-error bg-error/10 border-2 border-error/20 px-3 py-1 rounded-lg">
                            {cityRows.length - active} inactive
                          </span>
                        )}
                      </div>
                      <span className={cn('text-primary transition-transform', isOpen ? 'rotate-180' : '')}>
                        <ChevronDown size={20} strokeWidth={2.5} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t-2 border-table-border overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead>
                            <tr className="bg-primary text-white">
                              {['Pincode', 'Area', 'Days', 'Active', 'Actions'].map((h, i) => (
                                <th key={h} className={cn("px-5 py-3 font-black text-[10px] uppercase tracking-[0.2em] text-white/70", i < 4 ? "border-r border-white/10" : "", h === "Actions" || h === "Active" ? "text-center" : "")}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {cityRows.map((row, idx) => (
                              <tr key={row.id} className={cn("hover:bg-surface-container-low transition-colors", idx !== cityRows.length - 1 ? 'border-b-2 border-table-border' : '')}>
                                <td className="px-5 py-4 border-r border-table-border font-mono font-black text-xs text-primary tracking-widest">{row.pincode}</td>
                                <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface">{row.area_name ?? '—'}</td>
                                <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface-variant">{row.delivery_days}d</td>
                                <td className="px-5 py-4 border-r border-table-border text-center">
                                  <button
                                    onClick={() => handleToggle(row)}
                                    className={cn('relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors active:scale-95 mx-auto', row.is_active ? 'bg-primary border-primary' : 'bg-surface border-table-border')}
                                  >
                                    <span className={cn('inline-block h-3.5 w-3.5 rounded-full shadow transition-transform', row.is_active ? 'translate-x-5 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50')} />
                                  </button>
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <button onClick={() => handleDelete(row)} className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition-all active:scale-95">
                                    <Trash2 size={16} strokeWidth={2.5} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* CSV format hint */}
      <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">
        CSV import format: <code className="bg-surface border-2 border-table-border px-2 py-1 rounded-lg text-primary mx-1 normal-case font-mono tracking-normal">pincode,area_name,city,state,delivery_days</code>
      </p>
    </div>
  )
}

function PincodeTableRow({
  row,
  isLast,
  onToggle,
  onDelete,
}: {
  row: PincodeRow
  isLast: boolean
  onToggle: (row: PincodeRow) => void
  onDelete: (row: PincodeRow) => void
}) {
  return (
    <tr className={cn("hover:bg-surface-container-low transition-colors group", !isLast ? "border-b-2 border-table-border" : "")}>
      <td className="px-5 py-4 border-r border-table-border font-mono font-black text-xs text-primary tracking-widest">{row.pincode}</td>
      <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface">{row.area_name ?? '—'}</td>
      <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface">{row.city}</td>
      <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface-variant">{row.state}</td>
      <td className="px-5 py-4 border-r border-table-border font-bold text-sm text-on-surface-variant">{row.delivery_days}d</td>
      <td className="px-5 py-4 border-r border-table-border text-center">
        <button
          onClick={() => onToggle(row)}
          className={cn('relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors active:scale-95 mx-auto', row.is_active ? 'bg-primary border-primary' : 'bg-surface border-table-border')}
        >
          <span className={cn('inline-block h-3.5 w-3.5 rounded-full shadow transition-transform', row.is_active ? 'translate-x-5 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50')} />
        </button>
      </td>
      <td className="px-5 py-4 text-center">
        <button onClick={() => onDelete(row)} className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition-all active:scale-95">
          <Trash2 size={16} strokeWidth={2.5} />
        </button>
      </td>
    </tr>
  )
}
