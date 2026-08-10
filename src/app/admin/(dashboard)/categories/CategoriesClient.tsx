'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { Category } from '@/types/database.types'
import { Plus, Edit3, Trash2, Folder, Image as ImageIcon, Loader2 } from 'lucide-react'

export default function CategoriesClient({
  initialCategories,
  productCounts,
}: {
  initialCategories: Category[]
  productCounts: Record<string, number>
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const [orderDraft, setOrderDraft] = useState('')
  const showToast = useToastStore((s) => s.show)

  async function patchCategory(id: string, data: Partial<Category>) {
    setSaving(prev => ({ ...prev, [id]: true }))
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
      showToast('Changes saved successfully', 'success')
    } else {
      showToast('Failed to save changes', 'error')
    }
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  async function deleteCategory(id: string, name: string) {
    const count = productCounts[id] ?? 0
    const cat = categories.find(c => c.id === id)

    // A category with products CANNOT be deleted — products.category_id is
    // ON DELETE RESTRICT so its products are never silently destroyed. The old
    // copy asked "Delete anyway?", which promised something the database then
    // refused. Say what's actually possible instead, and offer the safe route.
    if (count > 0) {
      const plural = count === 1 ? '' : 's'
      if (cat?.is_active) {
        const deactivate = confirm(
          `"${name}" has ${count} product${plural} assigned, so it can't be deleted.\n\n` +
          `Deactivate it instead? That hides it from the storefront and leaves every product untouched.`,
        )
        if (deactivate) await patchCategory(id, { is_active: false })
        return
      }
      alert(
        `"${name}" has ${count} product${plural} assigned, so it can't be deleted.\n\n` +
        `It's already deactivated, so it's hidden from the storefront. To remove it entirely, ` +
        `first move ${count === 1 ? 'that product' : 'those products'} to another category.`,
      )
      return
    }

    if (!confirm(`Delete category "${name}"?`)) return

    setDeleting(id)
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCategories(prev => prev.filter(c => c.id !== id))
      showToast('Category deleted', 'success')
    } else {
      // The server sends a specific, admin-readable reason (never a raw DB error).
      const d = await res.json().catch(() => ({})) as { error?: string }
      showToast(d.error ?? 'Failed to delete category', 'error')
    }
    setDeleting(null)
  }

  async function saveOrder(id: string) {
    const order = parseInt(orderDraft, 10)
    if (!isNaN(order)) await patchCategory(id, { display_order: order })
    setEditOrderId(null)
  }

  const sorted = [...categories].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">
            Categories.
          </h1>
          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mt-1">
            {categories.length} total categories
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="flex items-center gap-1.5 px-5 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Category
        </Link>
      </div>

      {/* ── Table ── */}
      <div className="bg-surface-card rounded-2xl border-2 border-table-border overflow-hidden">
        {sorted.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-surface border-2 border-table-border rounded-2xl flex items-center justify-center mb-4">
              <Folder size={24} className="text-on-surface-variant/40" />
            </div>
            <p className="font-black text-sm uppercase tracking-widest text-on-surface-variant mb-6">No categories yet.</p>
            <Link
              href="/admin/categories/new"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
            >
              <Plus size={16} strokeWidth={2.5} />
              Create first category
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="py-4 px-5 w-16 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10">Image</th>
                  <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10">Name</th>
                  <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10">Slug</th>
                  <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10 text-center">Products</th>
                  <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10 text-center">Order</th>
                  <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 border-r border-white/10 text-center">Active</th>
                  <th className="py-4 px-5 font-black text-[10px] uppercase tracking-[0.2em] text-white/70 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((cat, idx) => (
                  <tr
                    key={cat.id}
                    className={cn(
                      'transition-colors group hover:bg-surface-container-low',
                      idx !== sorted.length - 1 ? 'border-b-2 border-table-border' : ''
                    )}
                  >
                    {/* Image */}
                    <td className="py-4 px-5 border-r border-table-border">
                      {cat.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.image_url}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover border-2 border-table-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-surface border-2 border-table-border flex items-center justify-center">
                          <ImageIcon size={20} className="text-on-surface-variant/40" />
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="py-4 px-5 border-r border-table-border min-w-[200px]">
                      <p className="font-bold text-sm text-primary">{cat.name}</p>
                      {cat.name_or && (
                        <p className="font-black text-[10px] uppercase tracking-widest text-on-surface-variant mt-0.5">{cat.name_or}</p>
                      )}
                    </td>

                    {/* Slug */}
                    <td className="py-4 px-5 border-r border-table-border font-black text-[10px] uppercase tracking-widest text-on-surface-variant">
                      {cat.slug}
                    </td>

                    {/* Product count */}
                    <td className="py-4 px-5 border-r border-table-border text-center">
                      <span className={cn(
                        'px-2.5 py-1 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest',
                        (productCounts[cat.id] ?? 0) > 0
                          ? 'bg-primary/5 text-primary border-primary/20'
                          : 'bg-surface text-on-surface-variant border-table-border',
                      )}>
                        {productCounts[cat.id] ?? 0}
                      </span>
                    </td>

                    {/* Display order (inline edit) */}
                    <td className="py-4 px-5 border-r border-table-border text-center">
                      {editOrderId === cat.id ? (
                        <input
                          type="number"
                          value={orderDraft}
                          autoFocus
                          min={0}
                          className="w-16 px-3 py-1.5 border-2 border-primary rounded-lg font-black text-sm text-center text-primary focus:outline-none"
                          onChange={e => setOrderDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveOrder(cat.id)
                            if (e.key === 'Escape') setEditOrderId(null)
                          }}
                          onBlur={() => saveOrder(cat.id)}
                        />
                      ) : (
                        <button
                          onClick={() => { setEditOrderId(cat.id); setOrderDraft(cat.display_order.toString()) }}
                          title="Click to edit order"
                          className="font-black text-sm text-primary px-3 py-1.5 rounded-lg border-2 border-transparent hover:border-table-border transition-colors active:scale-95"
                        >
                          {saving[cat.id] ? '…' : cat.display_order}
                        </button>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="py-4 px-5 border-r border-table-border text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={cat.is_active}
                        disabled={!!saving[cat.id]}
                        onClick={() => patchCategory(cat.id, { is_active: !cat.is_active })}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors disabled:opacity-50 active:scale-95 mx-auto',
                          cat.is_active ? 'bg-primary border-primary' : 'bg-surface border-table-border',
                        )}
                      >
                        <span className={cn(
                          'inline-block h-3.5 w-3.5 rounded-full shadow transition-transform',
                          cat.is_active ? 'translate-x-5 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50',
                        )} />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/admin/categories/${cat.id}`}
                          title="Edit"
                          className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all active:scale-95"
                        >
                          <Edit3 size={16} strokeWidth={2.5} />
                        </Link>
                        <button
                          onClick={() => deleteCategory(cat.id, cat.name)}
                          disabled={deleting === cat.id}
                          title="Delete"
                          className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition-all disabled:opacity-40 active:scale-95"
                        >
                          {deleting === cat.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} strokeWidth={2.5} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
