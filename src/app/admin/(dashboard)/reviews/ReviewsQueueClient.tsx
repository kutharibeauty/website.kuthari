'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Check, EyeOff, Loader2, Star, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type QueueReview = {
  id: string
  product_id: string
  reviewer_name: string
  rating: number
  title: string | null
  body: string | null
  is_verified_purchase: boolean
  is_admin_added: boolean
  is_approved: boolean
  created_at: string
  products: { name: string; slug: string; images: string[] | null } | null
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

export default function ReviewsQueueClient({
  tab, reviews: initial, counts,
}: { tab: 'pending' | 'approved' | 'all'; reviews: QueueReview[]; counts: { pending: number; approved: number } }) {
  const router = useRouter()
  const [reviews, setReviews] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function setApproved(r: QueueReview, is_approved: boolean) {
    setBusy(r.id); setError(null)
    const res = await fetch(`/api/reviews/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_approved }),
    })
    setBusy(null)
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Could not update the review'); return }
    // Leave the tab it no longer belongs to; stay in "All".
    setReviews((list) => tab === 'all' ? list.map((x) => (x.id === r.id ? { ...x, is_approved } : x)) : list.filter((x) => x.id !== r.id))
    router.refresh()
  }

  async function remove(r: QueueReview) {
    if (!confirm(`Delete ${r.reviewer_name}'s review? This can't be undone.`)) return
    setBusy(r.id); setError(null)
    const res = await fetch(`/api/reviews/${r.id}`, { method: 'DELETE' })
    setBusy(null)
    if (!res.ok) { setError('Could not delete the review'); return }
    setReviews((list) => list.filter((x) => x.id !== r.id))
    router.refresh()
  }

  const tabs = [
    { key: 'pending', label: 'Waiting', n: counts.pending },
    { key: 'approved', label: 'Live on the site', n: counts.approved },
    { key: 'all', label: 'All', n: counts.pending + counts.approved },
  ] as const

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 pb-12">
      <header className="border-b-2 border-table-border pb-5">
        <h1 className="text-2xl font-bold text-primary">Reviews</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Customer reviews stay hidden until you approve them. Approved reviews show on the product page and the homepage.
        </p>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter reviews">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/reviews?show=${t.key}`}
            className={cn(
              'shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors',
              tab === t.key ? 'border-primary bg-primary text-white' : 'border-table-border text-primary hover:border-primary/40',
            )}
          >
            {t.label} <span className="opacity-70">{t.n}</span>
          </Link>
        ))}
      </nav>

      {error && <p role="alert" className="rounded-xl border-2 border-error/40 bg-error/5 p-3 text-sm font-bold text-error">{error}</p>}

      {reviews.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-table-border p-10 text-center text-on-surface-variant">
          {tab === 'pending' ? 'No reviews waiting. You’re all caught up.' : 'No reviews here yet.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border-2 border-table-border bg-surface-card p-4 md:p-5">
              <div className="flex gap-3">
                {r.products?.images?.[0]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.products.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover bg-surface-container" />
                  : <div className="h-14 w-14 shrink-0 rounded-xl bg-surface-container" />}
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/products/${r.product_id}/reviews`} className="block truncate text-sm font-bold text-primary hover:underline">
                    {r.products?.name ?? 'Product'}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex" aria-label={`${r.rating} out of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={15} className={n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-table-border'} aria-hidden="true" />
                      ))}
                    </span>
                    <span className="text-[13px] font-semibold text-on-surface">{r.reviewer_name}</span>
                    {r.is_verified_purchase && (
                      <span className="flex items-center gap-1 text-[12px] font-bold text-success"><BadgeCheck size={13} /> Verified buyer</span>
                    )}
                    <span className="text-[12px] text-on-surface-variant">{when(r.created_at)}</span>
                  </div>
                  {r.title && <p className="mt-2 font-bold text-on-surface">{r.title}</p>}
                  {r.body && <p className="mt-1 text-[15px] text-on-surface whitespace-pre-line">{r.body}</p>}
                  {!r.title && !r.body && <p className="mt-2 text-[13px] italic text-on-surface-variant">Star rating only.</p>}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-table-border pt-3">
                {r.is_approved ? (
                  <>
                    <span className="mr-auto rounded-lg bg-success/10 px-2.5 py-1 text-xs font-bold text-success">Live</span>
                    <button onClick={() => setApproved(r, false)} disabled={busy === r.id} className="flex items-center gap-1.5 rounded-xl border-2 border-table-border px-4 py-2 text-sm font-bold text-primary hover:border-primary/40 disabled:opacity-50">
                      {busy === r.id ? <Loader2 size={15} className="animate-spin" /> : <EyeOff size={15} />} Hide
                    </button>
                  </>
                ) : (
                  <>
                    <span className="mr-auto rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Waiting</span>
                    <button onClick={() => setApproved(r, true)} disabled={busy === r.id} className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                      {busy === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Approve
                    </button>
                  </>
                )}
                <button onClick={() => remove(r)} disabled={busy === r.id} aria-label="Delete review" className="flex items-center gap-1.5 rounded-xl border-2 border-error/30 px-3 py-2 text-sm font-bold text-error hover:bg-error/5 disabled:opacity-50">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
