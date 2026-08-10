'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A single admin notification. `id` is a stable, namespaced key
 * (`order:<uuid>` / `unserviceable:<uuid>`) so the viewed-set survives across
 * refreshes and never collides between the two sources.
 */
export interface AdminNotification {
  id: string
  kind: 'order' | 'unserviceable'
  title: string
  subtitle: string
  href: string
  createdAt: string
}

/**
 * Per-browser record of which notifications this admin has already opened. Kept
 * in localStorage (not the DB) on purpose: it's UI-read state, so it needs no
 * migration and can't drift the schema. The list is pruned to the currently
 * live ids on every mount so it can never grow without bound.
 */
const STORAGE_KEY = 'bcr_admin_viewed_notifications'

function readViewedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

interface Props {
  items: AdminNotification[]
  /** The mobile bar is dark (primary); the desktop bar is white. */
  variant: 'mobile' | 'desktop'
}

export default function NotificationBell({ items, variant }: Props) {
  const [open, setOpen] = useState(false)
  const [viewed, setViewed] = useState<Set<string>>(new Set())
  // Until localStorage is read (client-only), treat nothing as viewed so the
  // server and first client render agree — avoids a hydration mismatch and a
  // wrong count flashing before the real viewed-set loads.
  const [ready, setReady] = useState(false)

  const idsKey = useMemo(() => items.map((i) => i.id).join(','), [items])

  useEffect(() => {
    const live = new Set(items.map((i) => i.id))
    const pruned = readViewedIds().filter((id) => live.has(id))
    setViewed(new Set(pruned))
    setReady(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
    } catch {
      /* private mode / quota — count simply won't persist */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  function persist(next: Set<string>) {
    setViewed(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    } catch {
      /* ignore */
    }
  }

  function markViewed(id: string) {
    if (viewed.has(id)) return
    const next = new Set(viewed)
    next.add(id)
    persist(next)
  }

  function markAllViewed() {
    persist(new Set(items.map((i) => i.id)))
  }

  const unviewedCount = ready ? items.filter((i) => !viewed.has(i.id)).length : 0

  const btnClass =
    variant === 'mobile'
      ? 'text-white/70 hover:text-white'
      : 'text-on-surface-variant hover:text-primary'
  const badgeBorder = variant === 'mobile' ? 'border-primary' : 'border-white'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn('relative p-2 transition-colors', btnClass)}
        aria-label={unviewedCount ? `Notifications (${unviewedCount} unread)` : 'Notifications'}
      >
        <Bell size={20} />
        {unviewedCount > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-error text-white text-[10px] font-black leading-none border-2',
              badgeBorder,
            )}
          >
            {unviewedCount > 9 ? '9+' : unviewedCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away layer. */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white border-2 border-table-border shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-table-border bg-surface">
              <p className="font-black text-sm text-primary uppercase tracking-wide">
                Notifications
              </p>
              {unviewedCount > 0 && (
                <button
                  onClick={markAllViewed}
                  className="text-[11px] font-black text-secondary hover:text-primary uppercase tracking-wide transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-on-surface-variant font-bold">
                  You&rsquo;re all caught up
                </p>
              ) : (
                items.map((item) => {
                  const isViewed = viewed.has(item.id)
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        markViewed(item.id)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 border-b border-table-border last:border-0 transition-colors hover:bg-surface',
                        !isViewed && 'bg-primary/[0.03]',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 w-2 h-2 rounded-full flex-shrink-0',
                          isViewed ? 'bg-transparent' : 'bg-error',
                        )}
                      />
                      <span className="material-symbols-outlined text-[20px] text-secondary flex-shrink-0">
                        {item.kind === 'order' ? 'receipt_long' : 'location_off'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-sm truncate',
                            isViewed
                              ? 'font-bold text-on-surface-variant'
                              : 'font-black text-primary',
                          )}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-on-surface-variant truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
