'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Camera, Check, Loader2, Minus, PackageX, Plus, X } from 'lucide-react'
import type { OrderItem } from '@/types/database.types'
import {
  ISSUE_REASONS, ISSUE_RESOLUTIONS, ISSUE_WINDOW_HOURS, MAX_ISSUE_PHOTOS, issueWindowLeft,
  type IssueReason, type IssueResolution, type OrderIssue,
} from '@/lib/orders/issues'

type OrderLike = { id: string; status: string; items: OrderItem[]; delivered_at?: string | null; updated_at?: string | null }

/** Shrink a phone photo to at most 1600px JPEG so uploads are quick and under 5 MB. */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file // a format the browser can't decode (e.g. HEIC off Safari): send as is
  }
}

const STEPS = ['Reported', 'Approved', 'Replacement sent']

/**
 * On a delivered order: a way to report damaged / wrong items within the
 * window, and the request's progress once reported. Replacement or exchange
 * only; no money refunds.
 */
export default function OrderIssuePanel({ order, initialIssue }: { order: OrderLike; initialIssue: OrderIssue | null }) {
  const [issue, setIssue] = useState(initialIssue)
  const [open, setOpen] = useState(false)
  const [now] = useState(() => Date.now())
  const left = issueWindowLeft(order, now)

  if (issue) return <IssueStatus issue={issue} />
  if (order.status !== 'delivered') return null
  if (left <= 0) {
    return (
      <p className="mb-4 text-[13px] text-on-surface-variant">
        Something wrong with this order? The {ISSUE_WINDOW_HOURS}-hour window to report it online has closed. Please call or WhatsApp us.
      </p>
    )
  }

  const deadline = new Date(now + left).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

  return (
    <>
      <section className="mb-4 flex flex-col gap-3 rounded-2xl border-2 border-table-border bg-surface-card p-4 sm:flex-row sm:items-center">
        <PackageX size={22} className="shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1">
          <p className="font-black text-primary text-[15px]">Item damaged, faulty or wrong?</p>
          <p className="text-[13px] text-on-surface-variant">Tell us by {deadline} and we&apos;ll replace or exchange it.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border-2 border-primary px-5 py-3 text-sm font-black text-primary hover:bg-primary hover:text-white active:scale-95 transition print:hidden"
        >
          Report a problem
        </button>
      </section>
      <AnimatePresence>
        {open && <ReportSheet order={order} onClose={() => setOpen(false)} onDone={(i) => { setIssue(i); setOpen(false) }} />}
      </AnimatePresence>
    </>
  )
}

function IssueStatus({ issue }: { issue: OrderIssue }) {
  const rejected = issue.status === 'rejected'
  const at = issue.status === 'requested' ? 0 : issue.status === 'approved' ? 1 : issue.status === 'resolved' ? 2 : 0
  const copy = {
    requested: 'We have your photos and details and will reply soon, usually within a day.',
    approved: `Approved. We're arranging your ${issue.resolution} and will call you if we need anything.`,
    resolved: 'Your replacement has been sent.',
    rejected: "We couldn't approve this request.",
  }[issue.status]
  return (
    <section role="status" className={`mb-4 rounded-2xl border-2 p-4 ${rejected ? 'border-error/40 bg-error/5' : 'border-primary/30 bg-surface-card'}`}>
      <p className="font-black text-primary text-[15px]">Your report: {ISSUE_REASONS[issue.reason].toLowerCase()}</p>
      <p className="mt-1 text-[13px] text-on-surface-variant">{copy}</p>
      {issue.admin_note && issue.status !== 'requested' && (
        <p className="mt-2 rounded-xl bg-surface-container px-3 py-2 text-[13px] text-on-surface">&ldquo;{issue.admin_note}&rdquo;</p>
      )}
      {!rejected && (
        <ol className="mt-3 grid grid-cols-3 gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="text-center">
              <span className={`block h-1.5 rounded-full ${i <= at ? 'bg-primary' : 'bg-table-border'}`} />
              <span className={`mt-1.5 block text-[11px] ${i === at ? 'font-black text-primary' : 'text-on-surface-variant'}`}>{s}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function ReportSheet({ order, onClose, onDone }: { order: OrderLike; onClose: () => void; onDone: (i: OrderIssue) => void }) {
  const [picked, setPicked] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {}
    if (order.items.length === 1) init[0] = 1
    return init
  })
  const [reason, setReason] = useState<IssueReason | ''>('')
  const [resolution, setResolution] = useState<IssueResolution>('replacement')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<Array<{ file: File; url: string }>>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needPhoto = reason !== 'missing_item'
  const ready = Object.keys(picked).length > 0 && !!reason && (!needPhoto || photos.length > 0)

  async function addPhotos(list: FileList | null) {
    if (!list) return
    const room = MAX_ISSUE_PHOTOS - photos.length
    const files = await Promise.all(Array.from(list).slice(0, room).map(shrink))
    setPhotos((p) => [...p, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }

  async function submit() {
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    const fd = new FormData()
    fd.set('reason', reason)
    fd.set('resolution', resolution)
    fd.set('description', description.trim())
    fd.set('items', JSON.stringify(Object.entries(picked).map(([index, quantity]) => ({ index: Number(index), quantity }))))
    photos.forEach((p) => fd.append('photos', p.file))
    try {
      const res = await fetch(`/api/orders/${order.id}/issue`, { method: 'POST', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Could not send your request.')
      onDone(d.issue)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your request.')
      setBusy(false)
    }
  }

  const label = 'mb-2 block text-[13px] font-black text-primary'
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center print:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface-card sm:rounded-3xl"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-table-border px-5 py-4">
          <h2 id="report-title" className="text-lg font-black text-primary">Report a problem</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container"><X size={20} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* 1. Items */}
          <div>
            <span className={label}>Which item?</span>
            <ul className="space-y-2">
              {order.items.map((it, i) => {
                const on = picked[i] !== undefined
                const max = Math.max(1, Number(it.quantity) || 1)
                return (
                  <li key={i} className={`flex items-center gap-3 rounded-xl border-2 p-2.5 ${on ? 'border-primary bg-primary/5' : 'border-table-border'}`}>
                    <button
                      type="button"
                      onClick={() => setPicked((p) => { const n = { ...p }; if (on) delete n[i]; else n[i] = 1; return n })}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-pressed={on}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-primary bg-primary text-white' : 'border-table-border'}`}>{on && <Check size={14} />}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-on-surface">{it.name}</span>
                        <span className="block text-[12px] text-on-surface-variant">{it.unit ? `${it.unit} · ` : ''}ordered {it.quantity}</span>
                      </span>
                    </button>
                    {on && max > 1 && (
                      <div className="flex shrink-0 items-center rounded-lg border-2 border-table-border">
                        <button type="button" aria-label="Fewer" onClick={() => setPicked((p) => ({ ...p, [i]: Math.max(1, p[i] - 1) }))} className="flex h-9 w-9 items-center justify-center"><Minus size={14} /></button>
                        <span className="w-6 text-center text-sm font-black">{picked[i]}</span>
                        <button type="button" aria-label="More" onClick={() => setPicked((p) => ({ ...p, [i]: Math.min(max, p[i] + 1) }))} className="flex h-9 w-9 items-center justify-center"><Plus size={14} /></button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* 2. Reason */}
          <fieldset>
            <legend className={label}>What went wrong?</legend>
            <div className="grid gap-2">
              {(Object.keys(ISSUE_REASONS) as IssueReason[]).map((r) => (
                <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-3 text-sm font-bold ${reason === r ? 'border-primary bg-primary/5 text-primary' : 'border-table-border text-on-surface'}`}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--color-primary)]" />
                  {ISSUE_REASONS[r]}
                </label>
              ))}
            </div>
          </fieldset>

          {/* 3. Photos */}
          <div>
            <span className={label}>Photos {needPhoto ? '(at least one)' : '(optional)'}</span>
            <p className="-mt-1 mb-2 text-[12px] text-on-surface-variant">Show the item and its outer box or packet. Up to {MAX_ISSUE_PHOTOS}.</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className="relative h-20 w-20 overflow-hidden rounded-xl border-2 border-table-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" aria-label="Remove photo" onClick={() => setPhotos((ps) => ps.filter((x) => x.url !== p.url))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"><X size={13} /></button>
                </div>
              ))}
              {photos.length < MAX_ISSUE_PHOTOS && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/40 text-[11px] font-black text-primary hover:bg-primary/5">
                  <Camera size={20} /> Add
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
                </label>
              )}
            </div>
          </div>

          {/* 4. Details */}
          <div>
            <label htmlFor="issue-desc" className={label}>Anything else? (optional)</label>
            <textarea id="issue-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3}
              placeholder="E.g. the cap was broken and the bottle leaked"
              className="w-full rounded-xl border-2 border-table-border bg-surface px-3 py-2.5 text-[15px] text-on-surface focus:border-primary focus:outline-none" />
          </div>

          {/* 5. What they want */}
          <fieldset>
            <legend className={label}>What would you like?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ISSUE_RESOLUTIONS) as IssueResolution[]).map((r) => (
                <label key={r} className={`flex cursor-pointer items-center justify-center rounded-xl border-2 px-3 py-3 text-center text-sm font-bold ${resolution === r ? 'border-primary bg-primary text-white' : 'border-table-border text-on-surface'}`}>
                  <input type="radio" name="resolution" value={r} checked={resolution === r} onChange={() => setResolution(r)} className="sr-only" />
                  {ISSUE_RESOLUTIONS[r]}
                </label>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-on-surface-variant">We replace or exchange items. Money isn&apos;t refunded for delivered orders.</p>
          </fieldset>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border-2 border-error/30 bg-error/5 p-3 text-sm font-bold text-error">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="border-t-2 border-table-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={submit}
            disabled={!ready || busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[15px] font-black text-white disabled:opacity-40 active:scale-[0.98] transition"
          >
            {busy ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : 'Send request'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
