'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/database.types'
import type { TimelineEntry } from '@/lib/orders/timeline'

const STATUS_LABEL: Record<string, string> = {
  placed:    'Placed',
  confirmed: 'Confirmed',
  packed:    'Packed',
  shipping:  'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned:  'Returned',
}

const ALL_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled', 'returned']

export default function TimelineClient({
  orderId,
  orderStatus,
  orderRef,
  initialTimeline,
  tableExists,
}: {
  orderId: string
  orderStatus: OrderStatus
  orderRef: string
  initialTimeline: TimelineEntry[]
  tableExists: boolean
}) {
  const [timeline, setTimeline] = useState(initialTimeline)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [form, setForm] = useState({
    status: orderStatus,
    title: '',
    email_subject: '',
    message: '',
    estimated_delivery: '',
    send_email: true,
  })

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setError(null)
    setSubmitting(true)

    const res = await fetch(`/api/orders/${orderId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: form.status,
        title: form.title.trim(),
        email_subject: form.email_subject.trim() || undefined,
        message: form.message.trim() || undefined,
        estimated_delivery: form.estimated_delivery.trim() || undefined,
        send_email: form.send_email,
      }),
    })

    if (res.ok) {
      const entry = await res.json() as TimelineEntry
      setTimeline(prev => [entry, ...prev])
      setForm(prev => ({ ...prev, title: '', email_subject: '', message: '', estimated_delivery: '' }))
      showToast(form.send_email ? 'Timeline update added — email sent to customer' : 'Timeline update added!')
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string; detail?: string }
      setError(data.detail ? `${data.error}: ${data.detail}` : (data.error ?? 'Failed to add update'))
    }

    setSubmitting(false)
  }

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-3xl mx-auto w-full pb-12 space-y-gutter">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/orders/${orderId}`}
          className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">Order Timeline</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{orderRef}</p>
        </div>
      </div>

      {/* ── Migration notice ── */}
      {!tableExists && (
        <div className="flex items-start gap-3 px-4 py-4 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="material-symbols-outlined text-amber-600 text-[20px] flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            info
          </span>
          <div>
            <p className="font-body-md text-body-md text-amber-800 font-medium">DB Migration Required</p>
            <p className="font-body-md text-body-md text-amber-700 mt-0.5">
              The <code className="bg-amber-100 px-1 rounded">order_timeline</code> table does not exist yet.
              Run the migration to enable timeline tracking. The form below is ready once the table is created.
            </p>
          </div>
        </div>
      )}

      {/* ── Add Update Form ── */}
      <div
        className="bg-surface rounded-2xl border border-outline-variant/50 p-6 space-y-5"
        style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}
      >
        <h3 className="font-headline-sm text-headline-sm text-primary border-b border-outline-variant/20 pb-3">
          Add Timeline Update
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface font-medium">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as OrderStatus }))}
                className={inputCls}
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface font-medium">
                Estimated Delivery
              </label>
              <input
                type="text"
                value={form.estimated_delivery}
                onChange={e => setForm(prev => ({ ...prev, estimated_delivery: e.target.value }))}
                placeholder="e.g. Tomorrow by 5 PM"
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface font-medium">
              Title <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder='e.g. "Your order is packed and ready for dispatch"'
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface font-medium">
              Email Subject
              <span className="font-label-sm text-label-sm text-on-surface-variant ml-2 font-normal">the subject line the customer sees — leave blank for the default</span>
            </label>
            <input
              type="text"
              value={form.email_subject}
              onChange={e => setForm(prev => ({ ...prev, email_subject: e.target.value }))}
              placeholder="e.g. Your Kuthari Beauty Store order is out for delivery 🚚"
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface font-medium">
              Custom Message
              <span className="font-label-sm text-label-sm text-on-surface-variant ml-2 font-normal">sent to customer</span>
            </label>
            <textarea
              value={form.message}
              onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
              placeholder="Additional details for the customer…"
              className={cn(inputCls, 'resize-none')}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.send_email}
              onChange={e => setForm(prev => ({ ...prev, send_email: e.target.checked }))}
              className="w-4 h-4 accent-primary rounded"
            />
            <span className="font-body-md text-body-md text-on-surface">Send email notification to customer</span>
          </label>

          {error && (
            <p className="flex items-center gap-2 font-body-md text-body-md text-error">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !tableExists}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            {submitting ? 'Saving…' : 'Add Update'}
          </button>
        </form>
      </div>

      {/* ── Timeline History ── */}
      <div
        className="bg-surface rounded-2xl border border-outline-variant/50 p-6"
        style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}
      >
        <h3 className="font-headline-sm text-headline-sm text-primary border-b border-outline-variant/20 pb-3 mb-5">
          History
        </h3>

        {timeline.length === 0 ? (
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[40px]">timeline</span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-3">
              {tableExists ? 'No timeline entries yet.' : 'Timeline entries will appear here after migration.'}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-outline-variant/40" />

            <div className="space-y-6">
              {timeline.map((entry, i) => (
                <div key={entry.id} className="flex gap-4 relative">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                    i === 0 ? 'bg-primary' : 'bg-surface-container border-2 border-outline-variant',
                  )}>
                    <span className={cn(
                      'material-symbols-outlined text-[14px]',
                      i === 0 ? 'text-on-primary' : 'text-on-surface-variant',
                    )} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {entry.status === 'delivered' ? 'check_circle' : entry.status === 'cancelled' ? 'cancel' : 'local_shipping'}
                    </span>
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-body-md text-body-md text-on-surface font-medium">{entry.title}</p>
                        {entry.status && (
                          <span className="font-label-sm text-label-sm text-on-surface-variant capitalize">
                            {STATUS_LABEL[entry.status] ?? entry.status}
                          </span>
                        )}
                      </div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {entry.message && (
                      <p className="font-body-md text-body-md text-on-surface-variant mt-1">{entry.message}</p>
                    )}
                    {entry.estimated_delivery && (
                      <p className="font-label-sm text-label-sm text-secondary mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {entry.estimated_delivery}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-on-surface text-surface rounded-full font-body-md text-body-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full px-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary hover:border-primary/40 focus:shadow-[0_0_0_4px_rgba(27,44,61,0.07)] transition-all duration-200'
