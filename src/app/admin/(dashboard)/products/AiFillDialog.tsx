'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Sparkles, X, AlertTriangle, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'

type Row = { id: string; name: string; active: boolean; hasDescription: boolean; hasSeo: boolean }
type Status = 'waiting' | 'working' | 'done' | 'skipped' | 'failed'
type Mode = 'missing' | 'all' | 'selected'

/**
 * "Fill with AI": writes the description and the SEO title,
 * description and keywords for many products, one product at a time, saving
 * each as it goes. By default only fills what's missing; can rewrite everything.
 */
export default function AiFillDialog({ selectedIds, onClose }: { selectedIds: string[]; onClose: (changed: boolean) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>(selectedIds.length ? 'selected' : 'missing')
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<Record<string, { s: Status; note?: string }>>({})
  const stopRef = useRef(false)
  const [changed, setChanged] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/products/ai-fill')
      .then(async (r) => {
        const d = await r.json()
        if (!alive) return
        if (!r.ok) setLoadError(d.error ?? 'Could not load products')
        else setRows(d.products)
      })
      .catch(() => alive && setLoadError('No connection'))
    return () => { alive = false }
  }, [])

  const overwrite = mode === 'all'
  const queue = (rows ?? []).filter((r) =>
    mode === 'selected' ? selectedIds.includes(r.id)
      : mode === 'all' ? true
        : !r.hasDescription || !r.hasSeo,
  )
  const missingCount = (rows ?? []).filter((r) => !r.hasDescription || !r.hasSeo).length
  const doneCount = Object.values(status).filter((x) => x.s === 'done' || x.s === 'skipped' || x.s === 'failed').length

  async function fill(id: string, part: 'description' | 'seo') {
    const res = await fetch(`/api/products/${id}/ai-fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ part, overwrite: overwrite || mode === 'selected' }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(d.error ?? `Failed (${res.status})`)
    return d as { updated?: boolean; skipped?: boolean }
  }

  async function start() {
    stopRef.current = false
    setRunning(true)
    setStatus(Object.fromEntries(queue.map((r) => [r.id, { s: 'waiting' as Status }])))
    for (const r of queue) {
      if (stopRef.current) break
      setStatus((s) => ({ ...s, [r.id]: { s: 'working', note: 'Writing description…' } }))
      try {
        const needDesc = overwrite || mode === 'selected' || !r.hasDescription
        const needSeo = overwrite || mode === 'selected' || !r.hasSeo
        let did = false
        if (needDesc) did = !!(await fill(r.id, 'description')).updated || did
        if (stopRef.current) { setStatus((s) => ({ ...s, [r.id]: { s: did ? 'done' : 'skipped', note: 'Stopped' } })); break }
        if (needSeo) {
          setStatus((s) => ({ ...s, [r.id]: { s: 'working', note: 'Writing SEO…' } }))
          did = !!(await fill(r.id, 'seo')).updated || did
        }
        if (did) setChanged(true)
        setStatus((s) => ({ ...s, [r.id]: { s: did ? 'done' : 'skipped', note: did ? 'Saved' : 'Already had content' } }))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed'
        setStatus((s) => ({ ...s, [r.id]: { s: 'failed', note: msg } }))
        // The daily free limit won't recover by trying the next product.
        if (/limit/i.test(msg) && /today|day/i.test(msg)) { stopRef.current = true }
      }
    }
    setRunning(false)
  }

  const icon = (s?: Status) =>
    s === 'working' ? <Loader2 size={16} className="animate-spin text-primary" />
      : s === 'done' ? <Check size={16} className="text-success" />
        : s === 'skipped' ? <SkipForward size={16} className="text-on-surface-variant" />
          : s === 'failed' ? <AlertTriangle size={16} className="text-error" />
            : <span className="h-2 w-2 rounded-full bg-table-border" />

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="ai-fill-title">
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-surface-card sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b-2 border-table-border px-6 py-5">
          <div>
            <h2 id="ai-fill-title" className="flex items-center gap-2 text-xl font-bold text-primary"><Sparkles size={20} /> Fill with AI</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Writes each product&apos;s description, SEO title, SEO description and search keywords, and saves them. About 1–2 minutes per product.
            </p>
          </div>
          <button onClick={() => { stopRef.current = true; onClose(changed) }} aria-label="Close" className="rounded-full p-2 hover:bg-surface-container"><X size={20} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {loadError && <p className="rounded-xl border-2 border-error/30 bg-error/5 p-3 text-sm font-bold text-error">{loadError}</p>}
          {!rows && !loadError && <p className="flex items-center gap-2 text-sm text-on-surface-variant"><Loader2 size={16} className="animate-spin" /> Checking products…</p>}

          {rows && !running && doneCount === 0 && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-bold text-primary">Which products?</legend>
              {[
                { key: 'missing', label: `Only those missing a description or SEO (${missingCount})`, hint: 'Keeps everything you already wrote.' },
                ...(selectedIds.length ? [{ key: 'selected', label: `The ${selectedIds.length} selected product${selectedIds.length === 1 ? '' : 's'}`, hint: 'Rewrites their description and SEO.' }] : []),
                { key: 'all', label: `All products (${rows.length})`, hint: 'Rewrites every description and SEO, replacing what is there.' },
              ].map((o) => (
                <label key={o.key} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3', mode === o.key ? 'border-primary bg-primary/5' : 'border-table-border')}>
                  <input type="radio" name="ai-mode" checked={mode === o.key} onChange={() => setMode(o.key as Mode)} className="mt-1 accent-[var(--color-primary)]" />
                  <span>
                    <span className="block text-sm font-bold text-primary">{o.label}</span>
                    <span className="block text-[13px] text-on-surface-variant">{o.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {rows && (running || doneCount > 0) && (
            <ul className="divide-y-2 divide-table-border rounded-xl border-2 border-table-border">
              {queue.map((r) => {
                const st = status[r.id]
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex w-5 justify-center">{icon(st?.s)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold capitalize text-primary">{r.name}</span>
                      {st?.note && <span className={cn('block text-[12px]', st.s === 'failed' ? 'text-error' : 'text-on-surface-variant')}>{st.note}</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t-2 border-table-border px-6 py-4">
          <p className="text-sm font-bold text-on-surface-variant">
            {running ? `${doneCount} of ${queue.length} done` : doneCount > 0 ? `Finished: ${doneCount} of ${queue.length}` : `${queue.length} product${queue.length === 1 ? '' : 's'} to fill`}
          </p>
          {running ? (
            <button onClick={() => { stopRef.current = true }} className="rounded-xl border-2 border-error/40 px-5 py-2.5 text-sm font-bold text-error">Stop after this one</button>
          ) : doneCount > 0 ? (
            <button onClick={() => onClose(changed)} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white">Done</button>
          ) : (
            <button onClick={start} disabled={!rows || queue.length === 0} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40">
              <Sparkles size={16} /> Start
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
