'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Loader2, MessageCircle, Phone, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Address } from '@/types/database.types'
import {
  ISSUE_REASONS, ISSUE_RESOLUTIONS, ISSUE_STATUS_LABEL, type OrderIssue,
} from '@/lib/orders/issues'
import { istDateTime, STATUS_CHIP } from '../format'

type Customer = { name: string; phone: string; email: string | null; address: Address | null }
type OrderInfo = { id: string; orderNumber: string; deliveredAt: string | null; orderedAt: string | null }

export default function IssueDetailClient({ issue: initial, order, customer }: { issue: OrderIssue; order: OrderInfo; customer: Customer }) {
  const [issue, setIssue] = useState(initial)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<null | 'approve' | 'reject' | 'resolve'>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const digits = customer.phone.replace(/\D/g, '')
  const waNumber = digits.length === 10 ? `91${digits}` : digits
  const a = customer.address

  async function act(action: 'approve' | 'reject' | 'resolve') {
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/order-issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Could not update the request')
      setIssue(d.issue)
      setNote('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the request')
    } finally {
      setBusy(null)
    }
  }

  const slip = [
    `${ISSUE_RESOLUTIONS[issue.resolution]} · Order #${order.orderNumber}`,
    `Customer: ${customer.name}`,
    `Phone: ${customer.phone}`,
    customer.email ? `Email: ${customer.email}` : null,
    a ? `Address: ${a.line1}${a.line2 ? `, ${a.line2}` : ''}, ${a.city}, ${a.state} ${a.pincode}` : null,
    'Items:',
    ...issue.items.map((i) => `  • ${i.name}${i.unit ? ` (${i.unit})` : ''} × ${i.quantity}`),
    `Problem: ${ISSUE_REASONS[issue.reason]}`,
  ].filter(Boolean).join('\n')

  async function copySlip() {
    await navigator.clipboard.writeText(slip)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const approved = issue.status === 'approved' || issue.status === 'resolved'

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 pb-16">
      <header className="flex flex-col gap-3 border-b-2 border-table-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/returns" className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-on-surface-variant hover:text-primary">
            <ArrowLeft size={14} /> Damaged &amp; wrong items
          </Link>
          <h1 className="text-2xl font-bold text-primary">{ISSUE_REASONS[issue.reason]}</h1>
          <p className="text-sm text-on-surface-variant">
            <Link href={`/admin/orders/${order.id}`} className="font-bold underline underline-offset-2">Order #{order.orderNumber}</Link>
            {' · '}reported {istDateTime(issue.created_at)}
            {order.deliveredAt ? ` · delivered ${istDateTime(order.deliveredAt)}` : ''}
          </p>
        </div>
        <span className={cn('self-start rounded-lg border-2 px-3 py-1.5 text-sm font-bold sm:self-auto', STATUS_CHIP[issue.status])}>
          {ISSUE_STATUS_LABEL[issue.status]}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* ── Evidence ── */}
        <div className="space-y-6">
          <section className="rounded-2xl border-2 border-table-border bg-surface-card p-5">
            <h2 className="mb-3 text-sm font-bold text-primary">Photos ({issue.photos.length})</h2>
            {issue.photos.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {issue.photos.map((p, i) => (
                  <a key={p} href={p} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border-2 border-table-border hover:border-primary/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`Customer photo ${i + 1}`} className="aspect-square w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">No photos (missing item).</p>
            )}
          </section>

          <section className="rounded-2xl border-2 border-table-border bg-surface-card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-primary">What the customer said</h2>
              <p className="mt-1 text-[15px] text-on-surface whitespace-pre-line">{issue.description || 'No details added.'}</p>
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary">They want</h2>
              <p className="mt-1 text-[15px] font-bold text-on-surface">{ISSUE_RESOLUTIONS[issue.resolution]}</p>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-bold text-primary">Items</h2>
              <ul className="divide-y-2 divide-table-border">
                {issue.items.map((it, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    {it.image
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={it.image} alt="" className="h-11 w-11 rounded-lg object-cover bg-surface-container" />
                      : <div className="h-11 w-11 rounded-lg bg-surface-container" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-primary">{it.name}</p>
                      <p className="text-xs text-on-surface-variant">{it.unit ? `${it.unit} · ` : ''}Qty {it.quantity}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* ── Decision / booking ── */}
        <div className="space-y-6">
          {issue.status === 'requested' && (
            <section className="rounded-2xl border-2 border-primary/30 bg-surface-card p-5 space-y-3">
              <h2 className="text-sm font-bold text-primary">Your decision</h2>
              <p className="text-sm text-on-surface-variant">
                Approving tells the customer we&apos;ll send a {issue.resolution} and emails the team the booking details.
                No money is refunded either way.
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Note for the customer (required to reject)"
                className="w-full rounded-xl border-2 border-table-border bg-surface px-3 py-2.5 text-sm text-primary focus:border-primary focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => act('approve')}
                  disabled={!!busy}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approve
                </button>
                <button
                  onClick={() => act('reject')}
                  disabled={!!busy || !note.trim()}
                  title={!note.trim() ? 'Add a note saying why' : undefined}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-error/40 py-3 text-sm font-bold text-error disabled:opacity-40"
                >
                  {busy === 'reject' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Reject
                </button>
              </div>
            </section>
          )}

          {issue.admin_note && (
            <section className="rounded-2xl border-2 border-table-border bg-surface-card p-5">
              <h2 className="text-sm font-bold text-primary">Note sent to customer</h2>
              <p className="mt-1 text-sm text-on-surface whitespace-pre-line">{issue.admin_note}</p>
              {issue.reviewed_by && <p className="mt-2 text-xs text-on-surface-variant">— {issue.reviewed_by}</p>}
            </section>
          )}

          {/* Customer details: full booking slip once approved. */}
          <section className={cn('rounded-2xl border-2 p-5 space-y-4', approved ? 'border-success/40 bg-success/5' : 'border-table-border bg-surface-card')}>
            <h2 className="text-sm font-bold text-primary">{approved ? 'Book the replacement' : 'Customer'}</h2>
            <div>
              <p className="text-lg font-bold text-primary">{customer.name}</p>
              <p className="text-sm text-on-surface">{customer.phone}{customer.email ? ` · ${customer.email}` : ''}</p>
            </div>
            {a && (
              <p className="text-sm leading-relaxed text-on-surface">
                {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pincode}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${customer.phone}`} className="flex items-center justify-center gap-2 rounded-xl border-2 border-table-border py-2.5 text-sm font-bold text-primary hover:border-primary/40">
                <Phone size={15} /> Call
              </a>
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border-2 border-whatsapp/40 py-2.5 text-sm font-bold text-whatsapp hover:bg-whatsapp/5">
                <MessageCircle size={15} /> WhatsApp
              </a>
            </div>
            {approved && (
              <button onClick={copySlip} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-table-border py-2.5 text-sm font-bold text-primary hover:border-primary/40">
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy booking details'}
              </button>
            )}
            {issue.status === 'approved' && (
              <button
                onClick={() => act('resolve')}
                disabled={!!busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy === 'resolve' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Mark replacement sent
              </button>
            )}
            {issue.status === 'resolved' && issue.resolved_at && (
              <p className="text-sm font-bold text-success">Sent {istDateTime(issue.resolved_at)}</p>
            )}
          </section>

          {error && <p role="alert" className="rounded-xl border-2 border-error/40 bg-error/5 p-3 text-sm font-bold text-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
