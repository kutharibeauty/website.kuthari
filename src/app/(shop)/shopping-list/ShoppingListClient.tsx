'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, ClipboardList, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type ListItem = { id: string; text: string; done: boolean }

const newId = () => Math.random().toString(36).slice(2, 10)

export default function ShoppingListClient() {
  const [items, setItems] = useState<ListItem[]>([])
  const [input, setInput] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Load the saved list.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/shopping-list')
        if (res.ok) {
          const { items } = (await res.json()) as { items: ListItem[] }
          setItems(items ?? [])
        }
      } finally {
        setLoaded(true)
      }
    })()
  }, [])

  // Debounced autosave whenever the list changes (after the initial load).
  useEffect(() => {
    if (!loaded) return
    clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/shopping-list', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        })
      } finally {
        setSaving(false)
      }
    }, 700)
    return () => clearTimeout(saveTimer.current)
  }, [items, loaded])

  const add = () => {
    const t = input.trim()
    if (!t) return
    setItems((p) => [...p, { id: newId(), text: t, done: false }])
    setInput('')
  }
  const toggle = (id: string) => setItems((p) => p.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
  const remove = (id: string) => setItems((p) => p.filter((i) => i.id !== id))

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 min-h-[60vh]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ClipboardList size={22} className="text-primary" />
          <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight capitalize">My Shopping List</h1>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
          {saving ? 'Saving…' : loaded ? 'Saved' : ''}
        </span>
      </div>
      <p className="text-sm font-medium text-on-surface-variant/70 mb-5">
        Jot down what you need to order — it&apos;s saved automatically to your account.
      </p>

      {/* Add row */}
      <div className="flex gap-2 mb-5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          placeholder="e.g. 10 boxes sunflower oil"
          className="flex-1 min-w-0 h-12 px-4 rounded-xl border-2 border-table-border bg-surface text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={add}
          className="h-12 px-5 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Plus size={16} strokeWidth={3} /> Add
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 gap-3">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
            <ClipboardList size={24} className="text-on-surface-variant/50" />
          </div>
          <p className="font-bold text-on-surface-variant/70 max-w-xs">Your list is empty. Add the items you plan to order.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-table-border bg-surface-card">
              <button
                onClick={() => toggle(it.id)}
                aria-pressed={it.done}
                className={cn(
                  'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  it.done ? 'bg-primary border-primary text-white' : 'border-table-border text-transparent hover:border-primary/50',
                )}
              >
                <Check size={14} strokeWidth={3} />
              </button>
              <span className={cn('flex-1 text-sm font-medium', it.done ? 'line-through text-on-surface-variant/40' : 'text-on-surface')}>
                {it.text}
              </span>
              <button
                onClick={() => remove(it.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-error hover:bg-error/5 transition-colors flex-shrink-0"
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
