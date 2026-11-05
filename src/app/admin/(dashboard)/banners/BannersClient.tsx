'use client'

import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { Banner, CmsContent, Json } from '@/types/database.types'
import { Plus, Image as ImageIcon, GripVertical, Edit3, Trash2, X, CloudUpload, Loader2, Save } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type TrustBadge = { icon: string; text: string; text_or: string }
type FooterLink  = { label: string; href: string }

const TABS = ['Banners', 'Homepage', 'Footer', 'Announcements']
const inputCls = 'w-full px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary placeholder:font-medium placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary hover:border-primary/40 focus:shadow-[0_0_0_4px_var(--color-haze)] transition duration-200'

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCms(content: CmsContent[], key: string): Json {
  return content.find(c => c.key === key)?.value ?? null
}

function asObj(v: Json): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return {}
}
function asArr<T>(v: Json): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}
function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}
function bool(v: unknown, fallback = true): boolean {
  return typeof v === 'boolean' ? v : fallback
}

const PLACEMENT_LABELS: Record<string, string> = {
  hero: 'Hero Carousel',
  mid_page: 'Promo Card',
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BannersClient({
  initialBanners,
  cmsContent,
}: {
  initialBanners: Banner[]
  cmsContent: CmsContent[]
}) {
  const [tab, setTab] = useState(0)
  const showToast = useToastStore((s) => s.show)

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="border-b-2 border-table-border pb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight capitalize">
          Banners &amp; CMS.
        </h1>
        <p className="font-bold text-[12px] text-on-surface-variant mt-2">
          Manage homepage content and settings
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b-2 border-table-border overflow-x-auto scrollbar-hide pb-2">
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={cn(
              'px-6 py-3 font-bold text-xs rounded-xl',
              'transition duration-200 ease-out active:scale-95',
              tab === i
                ? 'bg-primary text-white border-2 border-primary shadow-sm'
                : 'bg-surface text-on-surface-variant border-2 border-transparent hover:border-table-border hover:bg-surface-card hover:-translate-y-0.5'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {tab === 0 && <BannersTab initialBanners={initialBanners} onToast={showToast} />}
      {tab === 1 && <HomepageTab cmsContent={cmsContent} onToast={showToast} />}
      {tab === 2 && <FooterTab cmsContent={cmsContent} onToast={showToast} />}
      {tab === 3 && <AnnouncementsTab cmsContent={cmsContent} onToast={showToast} />}

    </div>
  )
}

// ── Tab 1: Banners ─────────────────────────────────────────────────────────────

type Toast = (msg: string, type?: 'success' | 'error' | 'info') => void

function BannersTab({
  initialBanners, onToast,
}: { initialBanners: Banner[]; onToast: Toast }) {
  const [banners, setBanners] = useState(initialBanners)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [formPlacement, setFormPlacement] = useState<Banner['placement']>('hero')
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState(false)

  const heroBanners = banners.filter(b => b.placement === 'hero')
  const promoBanners = banners.filter(b => b.placement === 'mid_page')

  async function reorder(items: Banner[], oldIdx: number, newIdx: number) {
    const reordered = arrayMove(items, oldIdx, newIdx).map((b, i) => ({ ...b, display_order: i }))
    const reorderedIds = new Set(reordered.map(b => b.id))
    setBanners(prev => [...prev.filter(b => !reorderedIds.has(b.id)), ...reordered])
    await Promise.all(reordered.map(b =>
      fetch(`/api/banners/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: b.display_order }),
      }),
    ))
  }

  async function toggleActive(id: string, current: boolean) {
    setSaving(prev => ({ ...prev, [id]: true }))
    const res = await fetch(`/api/banners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !current } : b))
      onToast('Changes saved successfully')
    } else {
      onToast('Failed to update banner', 'error')
    }
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  async function deleteBanner(id: string) {
    if (!confirm('Delete this banner?')) return
    const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBanners(prev => prev.filter(b => b.id !== id))
      onToast('Banner deleted')
    } else {
      onToast('Failed to delete banner', 'error')
    }
  }

  async function uploadImage(file: File): Promise<string> {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    setUploading(false)
    if (res.ok) { const d = await res.json() as { url: string }; return d.url }
    const d = await res.json().catch(() => ({})) as { error?: string }
    onToast(d.error ?? 'Image upload failed', 'error')
    return ''
  }

  async function saveBanner(data: Partial<Banner>) {
    if (editing?.id) {
      const res = await fetch(`/api/banners/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setBanners(prev => prev.map(b => b.id === editing.id ? { ...b, ...data } as Banner : b))
        onToast('Banner updated')
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string }
        onToast(d.error ?? 'Failed to save banner', 'error')
        return
      }
    } else {
      const samePlacementCount = banners.filter(b => b.placement === data.placement).length
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, display_order: samePlacementCount }),
      })
      if (res.ok) {
        const newBanner = await res.json() as { id: string }
        setBanners(prev => [...prev, { ...data, id: newBanner.id, display_order: samePlacementCount, created_at: new Date().toISOString() } as Banner])
        onToast('Banner created')
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string }
        onToast(d.error ?? 'Failed to create banner', 'error')
        return
      }
    }
    setShowForm(false); setEditing(null)
  }

  return (
    <div className="space-y-10">
      {showForm && (
        <BannerFormModal
          banner={editing}
          defaultPlacement={formPlacement}
          uploading={uploading}
          onUpload={uploadImage}
          onSave={saveBanner}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      <BannerSection
        title="Hero Carousel"
        hint="Full-width homepage banner. Rotates automatically."
        items={heroBanners}
        saving={saving}
        onAdd={() => { setEditing(null); setFormPlacement('hero'); setShowForm(true) }}
        onToggle={id => toggleActive(id, banners.find(b => b.id === id)!.is_active)}
        onEdit={b => { setEditing(b); setFormPlacement(b.placement); setShowForm(true) }}
        onDelete={deleteBanner}
        onReorder={reorder}
      />

      <BannerSection
        title="Promo Cards"
        hint="Up to 4 small cards shown below the hero banner."
        items={promoBanners}
        saving={saving}
        onAdd={() => { setEditing(null); setFormPlacement('mid_page'); setShowForm(true) }}
        onToggle={id => toggleActive(id, banners.find(b => b.id === id)!.is_active)}
        onEdit={b => { setEditing(b); setFormPlacement(b.placement); setShowForm(true) }}
        onDelete={deleteBanner}
        onReorder={reorder}
      />
    </div>
  )
}

function BannerSection({
  title, hint, items, saving, onAdd, onToggle, onEdit, onDelete, onReorder,
}: {
  title: string
  hint: string
  items: Banner[]
  saving: Record<string, boolean>
  onAdd: () => void
  onToggle: (id: string) => void
  onEdit: (b: Banner) => void
  onDelete: (id: string) => void
  onReorder: (items: Banner[], oldIdx: number, newIdx: number) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(b => b.id === active.id)
    const newIdx = items.findIndex(b => b.id === over.id)
    onReorder(items, oldIdx, newIdx)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-primary tracking-tight">{title}</h3>
          <p className="font-bold text-[12px] text-on-surface-variant mt-1">{hint}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-5 py-3 bg-primary text-white rounded-xl font-bold text-[12px] hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center bg-surface-card rounded-2xl border-2 border-table-border">
          <div className="w-16 h-16 mx-auto bg-surface border-2 border-table-border rounded-2xl flex items-center justify-center mb-4">
            <ImageIcon size={24} className="text-on-surface-variant/40" />
          </div>
          <p className="font-bold text-sm text-on-surface-variant">None yet.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map(banner => (
                <SortableBannerRow
                  key={banner.id}
                  banner={banner}
                  saving={!!saving[banner.id]}
                  onToggle={() => onToggle(banner.id)}
                  onEdit={() => onEdit(banner)}
                  onDelete={() => onDelete(banner.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SortableBannerRow({
  banner, saving, onToggle, onEdit, onDelete,
}: { banner: Banner; saving: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: banner.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-4 p-4 bg-surface rounded-2xl border-2 border-table-border group',
        isDragging && 'opacity-50 shadow-xl border-primary bg-primary/5',
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-on-surface-variant/40 hover:text-primary transition-colors p-1">
        <GripVertical size={24} />
      </button>
      {banner.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner.image_url} alt="" className="w-32 h-16 object-cover rounded-xl border-2 border-table-border flex-shrink-0" />
      ) : (
        <div
          className="w-32 h-16 rounded-xl border-2 border-table-border flex items-center justify-center flex-shrink-0 px-2"
          style={{ backgroundColor: banner.background_color }}
        >
          <span
            className="text-[12px] font-bold text-center leading-tight truncate"
            style={{ color: banner.text_color }}
          >
            {banner.title || 'Text banner'}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-primary truncate">
          {banner.title || '(no title)'}
        </p>
        {banner.link_url && (
          <p className="font-bold text-[12px] text-on-surface-variant truncate mt-1">{banner.link_url}</p>
        )}
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={banner.is_active}
          disabled={saving}
          onClick={onToggle}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors disabled:opacity-50 active:scale-95',
            banner.is_active ? 'bg-primary border-primary' : 'bg-surface border-table-border',
          )}
        >
          <span className={cn('inline-block h-3.5 w-3.5 rounded-full shadow transition-transform', banner.is_active ? 'translate-x-5 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50')} />
        </button>
        <button onClick={onEdit} className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-primary/40 hover:text-primary transition active:scale-95">
          <Edit3 size={16} strokeWidth={2.5} />
        </button>
        <button onClick={onDelete} className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition active:scale-95">
          <Trash2 size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

function BannerFormModal({
  banner, defaultPlacement, uploading, onUpload, onSave, onClose,
}: {
  banner: Banner | null
  defaultPlacement: Banner['placement']
  uploading: boolean
  onUpload: (f: File) => Promise<string>
  onSave: (data: Partial<Banner>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    title: banner?.title ?? '',
    title_or: banner?.title_or ?? '',
    subtitle: banner?.subtitle ?? '',
    subtitle_or: banner?.subtitle_or ?? '',
    image_url: banner?.image_url ?? '',
    link_url: banner?.link_url ?? '',
    cta_text: banner?.cta_text ?? '',
    cta_text_or: banner?.cta_text_or ?? '',
    background_color: banner?.background_color || '#1B2C3D',
    text_color: banner?.text_color || '#FFFFFF',
    placement: banner?.placement ?? defaultPlacement,
    display_seconds: banner?.display_seconds ?? 5,
    is_active: banner?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto border-2 border-table-border">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-table-border">
          <h3 className="font-bold text-xl text-primary tracking-tight">
            {banner ? 'Edit Banner.' : `Add ${PLACEMENT_LABELS[form.placement] ?? 'Banner'}.`}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:bg-surface-card transition-colors active:scale-95">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Live preview */}
          <div className="space-y-2">
            <label className="font-bold text-xs text-primary">Live Preview</label>
            <div
              className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-center border-2 border-table-border"
              style={form.image_url ? { aspectRatio: '5 / 2' } : { backgroundColor: form.background_color, minHeight: 110 }}
            >
              {form.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="relative z-10">
                <p className="font-bold text-lg leading-tight" style={{ color: form.text_color }}>
                  {form.title || (form.image_url ? '' : 'Banner title')}
                </p>
                {form.subtitle && (
                  <p className="text-sm font-medium mt-1 opacity-85" style={{ color: form.text_color }}>{form.subtitle}</p>
                )}
                {form.cta_text && (
                  <span
                    className="inline-flex w-max items-center px-3 py-1.5 rounded-lg bg-black/20 text-xs font-bold mt-3"
                    style={{ color: form.text_color }}
                  >
                    {form.cta_text}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Placement + Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="font-bold text-xs text-primary">Placement</label>
              <select
                value={form.placement}
                onChange={e => setForm(p => ({ ...p, placement: e.target.value as Banner['placement'] }))}
                className={inputCls}
              >
                <option value="hero">Hero Carousel</option>
                <option value="mid_page">Promo Card</option>
              </select>
            </div>

            {/* Only the hero rotates — a promo card just sits there, so this
                setting would be meaningless outside the carousel. */}
            {form.placement === 'hero' && (
              <div className="space-y-2">
                <label className="font-bold text-xs text-primary">
                  Display Time
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={form.display_seconds}
                    onChange={e =>
                      setForm(p => ({
                        ...p,
                        // Clamp on blur rather than per keystroke, so clearing
                        // the box to retype doesn't fight the user.
                        display_seconds: e.target.value === '' ? '' as unknown as number : parseInt(e.target.value, 10),
                      }))
                    }
                    onBlur={e => {
                      const n = parseInt(e.target.value, 10)
                      setForm(p => ({ ...p, display_seconds: Number.isFinite(n) ? Math.min(Math.max(n, 1), 60) : 5 }))
                    }}
                    className={cn(inputCls, 'w-24')}
                  />
                  <span className="font-bold text-xs text-on-surface-variant whitespace-nowrap">
                    seconds
                  </span>
                </div>
                <p className="text-[11px] font-medium text-on-surface-variant/70">
                  How long this banner stays before the next one. 1–60.
                </p>
              </div>
            )}
            {/* Background colour only matters for text-only banners — a full
                image covers it, so hide it once an image is uploaded. */}
            {!form.image_url && (
              <div className="space-y-2">
                <label className="font-bold text-xs text-primary">Background</label>
                <div className="flex gap-2 items-center">
                  <div className="relative w-11 h-11 flex-shrink-0">
                    <input type="color" value={form.background_color} onChange={e => setForm(p => ({ ...p, background_color: e.target.value }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="w-full h-full rounded-lg border-2 border-table-border pointer-events-none" style={{ backgroundColor: form.background_color }} />
                  </div>
                  <input type="text" value={form.background_color} onChange={e => setForm(p => ({ ...p, background_color: e.target.value }))} className={cn(inputCls, 'flex-1 font-mono text-xs px-3')} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="font-bold text-xs text-primary">Text Color</label>
              <div className="flex gap-2 items-center">
                <div className="relative w-11 h-11 flex-shrink-0">
                  <input type="color" value={form.text_color} onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="w-full h-full rounded-lg border-2 border-table-border pointer-events-none" style={{ backgroundColor: form.text_color }} />
                </div>
                <input type="text" value={form.text_color} onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))} className={cn(inputCls, 'flex-1 font-mono text-xs px-3')} />
              </div>
            </div>
          </div>

          {/* Image (optional) */}
          <div className="space-y-2">
            <label className="font-bold text-xs text-primary flex items-center">
              Banner Image
              <span className="font-bold text-[12px] text-on-surface-variant ml-3 normal-case tracking-normal">Optional — text-only banners work fine</span>
            </label>
            {form.image_url ? (
              <div className="relative inline-block group w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="" className="w-full h-48 object-cover rounded-xl border-2 border-table-border" />
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                  className="absolute top-3 right-3 w-8 h-8 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <label className={cn(
                'flex flex-col items-center justify-center h-32 border-2 border-dashed border-table-border bg-surface-card rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition active:scale-[0.99]',
                uploading && 'opacity-50 pointer-events-none',
              )}>
                <div className="p-3 bg-surface border-2 border-table-border rounded-xl mb-3">
                  <CloudUpload size={24} className="text-primary" />
                </div>
                <p className="font-bold text-xs text-primary text-center">
                  {uploading ? 'Uploading…' : 'Upload image'}
                </p>
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return
                    const url = await onUpload(f)
                    if (url) setForm(p => ({ ...p, image_url: url }))
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-bold text-xs text-primary">Title</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Stock up on beauty essentials" />
            </div>
            <div className="space-y-2">
              <label className="font-bold text-xs text-primary">Subtitle</label>
              <input type="text" value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-xs text-primary">Link URL</label>
            <input type="text" value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} className={inputCls} placeholder="/search?category=skincare" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-bold text-xs text-primary">CTA Text</label>
              <input type="text" value={form.cta_text} onChange={e => setForm(p => ({ ...p, cta_text: e.target.value }))} className={inputCls} placeholder="Shop Now" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 p-5 bg-surface-card rounded-2xl border-2 border-table-border max-w-sm">
            <div>
              <p className="font-bold text-xs text-primary">Active</p>
              <p className="font-bold text-[12px] text-on-surface-variant mt-1">Show on site</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
              className={cn('relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-colors active:scale-95', form.is_active ? 'bg-primary border-primary' : 'bg-surface border-table-border')}
            >
              <span className={cn('inline-block h-4 w-4 rounded-full shadow transition-transform', form.is_active ? 'translate-x-6 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50')} />
            </button>
          </div>

          <div className="flex gap-4 pt-4 border-t-2 border-table-border">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-table-border bg-surface font-bold text-xs text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors active:scale-95">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-opacity active:scale-95 shadow-sm"
            >
              {saving ? 'Saving…' : 'Save Banner'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab 2: Homepage ────────────────────────────────────────────────────────────

function HomepageTab({ cmsContent, onToast }: { cmsContent: CmsContent[]; onToast: Toast }) {
  const heroRaw = asObj(getCms(cmsContent, 'hero'))
  const trustRaw = asArr<TrustBadge>(getCms(cmsContent, 'trust_badges'))
  const statsRaw = asObj(getCms(cmsContent, 'store_stats'))
  const statItemsRaw = Array.isArray(statsRaw.items) ? (statsRaw.items as { value?: unknown; label?: unknown }[]) : []
  const reviewsRaw = asArr<{ name?: unknown; text?: unknown; rating?: unknown; source?: unknown }>(getCms(cmsContent, 'testimonials'))
  // Real reviews copied from Google or Justdial for the home page wall.
  const [testimonials, setTestimonials] = useState(
    reviewsRaw.map((r) => ({ name: str(r.name), text: str(r.text), rating: Number(r.rating) || 5, source: str(r.source) || 'Google' })),
  )

  const [hero, setHero] = useState({
    title_en: str(heroRaw.title_en),
    accent_en: str(heroRaw.accent_en),
    title_or: str(heroRaw.title_or),
    subtitle_en: str(heroRaw.subtitle_en),
    subtitle_or: str(heroRaw.subtitle_or),
  })
  // Home page "years behind the counter" band. Empty fields fall back to the
  // site's current copy, so nothing here is required.
  const [stats, setStats] = useState({
    headline: str(statsRaw.headline),
    accent: str(statsRaw.accent),
    blurb: str(statsRaw.blurb),
    items: [0, 1, 2, 3].map((i) => ({ value: str(statItemsRaw[i]?.value), label: str(statItemsRaw[i]?.label) })),
  })
  const [badges, setBadges] = useState<TrustBadge[]>(
    trustRaw.length > 0 ? trustRaw : [
      { icon: 'inventory_2', text: 'One piece or a full box', text_or: '' },
      { icon: 'payments', text: 'Secure online payment', text_or: '' },
      { icon: 'local_shipping', text: 'Delivery across India', text_or: '' },
    ],
  )
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const results = await Promise.all([
      fetch('/api/cms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'hero', value: hero }) }),
      fetch('/api/cms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'trust_badges', value: badges }) }),
      fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'store_stats', value: { ...stats, items: stats.items.filter((i) => i.value.trim()) } }),
      }),
      fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'testimonials',
          value: testimonials
            .map((t) => ({ ...t, name: t.name.trim(), text: t.text.trim().slice(0, 400), rating: Math.min(5, Math.max(1, t.rating)) }))
            .filter((t) => t.name && t.text),
        }),
      }),
    ])
    setSaving(false)
    const ok = results.every(r => r.ok)
    onToast(ok ? 'Changes saved successfully' : 'Failed to save — please try again', ok ? 'success' : 'error')
  }

  return (
    <div className="space-y-10 max-w-4xl">
      <CmsSection title="Hero headline">
        <p className="text-sm text-on-surface-variant -mt-2 mb-4">The big text at the top of the home page. Leave a field empty to keep the current wording.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CmsField label="Headline (big capitals)" hint="Keep it short: 2 to 4 words.">
            <input type="text" value={hero.title_en} onChange={e => setHero(p => ({ ...p, title_en: e.target.value }))} className={inputCls} placeholder="The beauty counter," />
          </CmsField>
          <CmsField label="Second line (italic)" hint="Shown under the headline in the italic font.">
            <input type="text" value={hero.accent_en} onChange={e => setHero(p => ({ ...p, accent_en: e.target.value }))} className={inputCls} placeholder="at your door." />
          </CmsField>
          <CmsField label="One sentence under it" extraClass="md:col-span-2">
            <input type="text" value={hero.subtitle_en} onChange={e => setHero(p => ({ ...p, subtitle_en: e.target.value }))} className={inputCls} placeholder="Skincare, haircare and salon stock from our Brahmapur shop, sent across India." />
          </CmsField>
        </div>
      </CmsSection>

      <CmsSection title="Customer reviews">
        <p className="text-sm text-on-surface-variant -mt-2 mb-4">
          Shown on the home page under approved product reviews. Copy real reviews word for word from Google or Justdial, with the reviewer&apos;s name as it appears there.
        </p>
        <div className="space-y-4">
          {testimonials.map((t, i) => (
            <div key={i} className="grid gap-3 rounded-2xl border border-table-border bg-surface-card p-4 md:grid-cols-[1fr_140px_120px_auto]">
              <input
                type="text"
                value={t.name}
                onChange={(e) => setTestimonials((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                className={cn(inputCls, 'py-2.5')}
                placeholder="Reviewer's name"
                aria-label={`Review ${i + 1} name`}
              />
              <select
                value={t.source}
                onChange={(e) => setTestimonials((p) => p.map((x, j) => (j === i ? { ...x, source: e.target.value } : x)))}
                className={cn(inputCls, 'py-2.5')}
                aria-label={`Review ${i + 1} source`}
              >
                <option>Google</option>
                <option>Justdial</option>
                <option>IndiaMART</option>
                <option>In store</option>
              </select>
              <select
                value={t.rating}
                onChange={(e) => setTestimonials((p) => p.map((x, j) => (j === i ? { ...x, rating: Number(e.target.value) } : x)))}
                className={cn(inputCls, 'py-2.5')}
                aria-label={`Review ${i + 1} stars`}
              >
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
              </select>
              <button
                type="button"
                onClick={() => setTestimonials((p) => p.filter((_, j) => j !== i))}
                className="rounded-xl border border-table-border px-3 text-on-surface-variant hover:border-error/40 hover:text-error"
                aria-label={`Remove review ${i + 1}`}
              >
                <Trash2 size={16} />
              </button>
              <textarea
                value={t.text}
                onChange={(e) => setTestimonials((p) => p.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                className={cn(inputCls, 'md:col-span-4 min-h-[80px]')}
                placeholder="The review, word for word"
                maxLength={400}
                aria-label={`Review ${i + 1} text`}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTestimonials((p) => [...p, { name: '', text: '', rating: 5, source: 'Google' }])}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-table-border py-4 text-[14px] font-semibold text-on-surface-variant hover:border-primary hover:text-primary"
          >
            <Plus size={16} /> Add a review
          </button>
        </div>
      </CmsSection>

      <CmsSection title="Store figures band">
        <p className="text-sm text-on-surface-variant -mt-2 mb-4">The dark band near the bottom of the home page. Only use numbers you can stand behind.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CmsField label="Headline">
            <input type="text" value={stats.headline} onChange={e => setStats(p => ({ ...p, headline: e.target.value }))} className={inputCls} placeholder="27 years" />
          </CmsField>
          <CmsField label="Italic line">
            <input type="text" value={stats.accent} onChange={e => setStats(p => ({ ...p, accent: e.target.value }))} className={inputCls} placeholder="behind the counter." />
          </CmsField>
          <CmsField label="Sentence" extraClass="md:col-span-2">
            <input type="text" value={stats.blurb} onChange={e => setStats(p => ({ ...p, blurb: e.target.value }))} className={inputCls} placeholder="Retail and bulk, from one shop in Sano Bazar, Brahmapur." />
          </CmsField>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.items.map((item, i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-table-border bg-surface-card p-3">
              <input
                type="text"
                value={item.value}
                onChange={e => setStats(p => ({ ...p, items: p.items.map((x, j) => j === i ? { ...x, value: e.target.value } : x) }))}
                className={cn(inputCls, 'w-28 py-2.5')}
                placeholder={['27+', '4', '350K+', ''][i] || 'Number'}
                aria-label={`Figure ${i + 1} number`}
              />
              <input
                type="text"
                value={item.label}
                onChange={e => setStats(p => ({ ...p, items: p.items.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))}
                className={cn(inputCls, 'flex-1 py-2.5')}
                placeholder={['years in business', 'states served', 'happy customers', 'optional fourth figure'][i]}
                aria-label={`Figure ${i + 1} label`}
              />
            </div>
          ))}
        </div>
      </CmsSection>

      <CmsSection title="Trust Badges">
        <div className="space-y-4">
          {badges.map((badge, i) => (
            <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-surface-card rounded-2xl border-2 border-table-border">
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full">
                <input
                  type="text"
                  value={badge.icon}
                  onChange={e => setBadges(prev => prev.map((b, j) => j === i ? { ...b, icon: e.target.value } : b))}
                  className={cn(inputCls, 'w-full sm:w-40 py-2.5')}
                  placeholder="Material Icon"
                />
                {badge.icon && (
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{badge.icon}</span>
                  </div>
                )}
                <input
                  type="text"
                  value={badge.text}
                  onChange={e => setBadges(prev => prev.map((b, j) => j === i ? { ...b, text: e.target.value } : b))}
                  className={cn(inputCls, 'flex-1 py-2.5')}
                  placeholder="Badge text"
                />
              </div>
              <button onClick={() => setBadges(prev => prev.filter((_, j) => j !== i))} className="p-2.5 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition-colors self-end sm:self-auto active:scale-95">
                <Trash2 size={16} strokeWidth={2.5} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setBadges(prev => [...prev, { icon: 'star', text: '', text_or: '' }])}
            className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-table-border bg-surface-card rounded-2xl font-bold text-[12px] text-on-surface-variant hover:border-primary hover:text-primary transition-colors active:scale-[0.99]"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Badge
          </button>
        </div>
      </CmsSection>

      <SaveBar saving={saving} onSave={save} />
    </div>
  )
}

// ── Tab 3: Footer ──────────────────────────────────────────────────────────────

function FooterTab({ cmsContent, onToast }: { cmsContent: CmsContent[]; onToast: Toast }) {
  const footerRaw = asObj(getCms(cmsContent, 'footer'))
  const linksRaw = asArr<FooterLink>(getCms(cmsContent, 'footer_links'))
  const socialRaw = asObj(getCms(cmsContent, 'social_links'))

  const [footer, setFooter] = useState({
    tagline_en: str(footerRaw.tagline_en),
    tagline_or: str(footerRaw.tagline_or),
    phone: str(footerRaw.phone),
    email: str(footerRaw.email),
    address: str(footerRaw.address),
    hours: str(footerRaw.hours),
  })
  const [links, setLinks] = useState<FooterLink[]>(linksRaw)
  const [social, setSocial] = useState({
    instagram: str(socialRaw.instagram),
    facebook: str(socialRaw.facebook),
    whatsapp: str(socialRaw.whatsapp),
    youtube: str(socialRaw.youtube),
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const results = await Promise.all([
      fetch('/api/cms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'footer', value: footer }) }),
      fetch('/api/cms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'footer_links', value: links }) }),
      fetch('/api/cms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'social_links', value: social }) }),
    ])
    setSaving(false)
    const ok = results.every(r => r.ok)
    onToast(ok ? 'Changes saved successfully' : 'Failed to save — please try again', ok ? 'success' : 'error')
  }

  return (
    <div className="space-y-10 max-w-4xl">
      <CmsSection title="Contact Info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CmsField label="Tagline">
            <input type="text" value={footer.tagline_en} onChange={e => setFooter(p => ({ ...p, tagline_en: e.target.value }))} className={inputCls} placeholder="Your trusted beauty store" />
          </CmsField>
          <CmsField label="Phone">
            <input type="text" value={footer.phone} onChange={e => setFooter(p => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="+91 98612 35276, +91 78490 76520" />
          </CmsField>
          <CmsField label="Email">
            <input type="email" value={footer.email} onChange={e => setFooter(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="smortika@gmail.com" />
          </CmsField>
          <CmsField label="Shop hours">
            <input type="text" value={footer.hours} onChange={e => setFooter(p => ({ ...p, hours: e.target.value }))} className={inputCls} placeholder="Monday to Saturday, 9 am to 6 pm" />
          </CmsField>
          <CmsField label="Address" extraClass="md:col-span-2">
            <input type="text" value={footer.address} onChange={e => setFooter(p => ({ ...p, address: e.target.value }))} className={inputCls} placeholder="Brahmapur, Odisha" />
          </CmsField>
        </div>
      </CmsSection>

      <CmsSection title="Quick Links">
        <div className="space-y-4">
          {links.map((link, i) => (
            <div key={i} className="flex flex-col sm:flex-row items-center gap-4">
              <input type="text" value={link.label} onChange={e => setLinks(prev => prev.map((l, j) => j === i ? { ...l, label: e.target.value } : l))} className={cn(inputCls, 'flex-1')} placeholder="Link Label" />
              <input type="text" value={link.href} onChange={e => setLinks(prev => prev.map((l, j) => j === i ? { ...l, href: e.target.value } : l))} className={cn(inputCls, 'flex-1')} placeholder="/path" />
              <button onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))} className="p-3.5 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition-colors w-full sm:w-auto active:scale-95">
                <Trash2 size={16} strokeWidth={2.5} className="mx-auto" />
              </button>
            </div>
          ))}
          <button onClick={() => setLinks(prev => [...prev, { label: '', href: '' }])} className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-table-border bg-surface-card rounded-2xl font-bold text-[12px] text-on-surface-variant hover:border-primary hover:text-primary transition-colors active:scale-[0.99]">
            <Plus size={16} strokeWidth={2.5} />
            Add Link
          </button>
        </div>
      </CmsSection>

      <CmsSection title="Social Media">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['instagram', 'facebook', 'whatsapp', 'youtube'] as const).map(platform => (
            <CmsField key={platform} label={platform.charAt(0).toUpperCase() + platform.slice(1)}>
              <input type="url" value={social[platform]} onChange={e => setSocial(p => ({ ...p, [platform]: e.target.value }))} className={inputCls} placeholder={`https://${platform}.com/…`} />
            </CmsField>
          ))}
        </div>
      </CmsSection>

      <SaveBar saving={saving} onSave={save} />
    </div>
  )
}

// ── Tab 4: Announcements ───────────────────────────────────────────────────────

function AnnouncementsTab({ cmsContent, onToast }: { cmsContent: CmsContent[]; onToast: Toast }) {
  // The public site reads the `site_announcement` key (see homepage.ts and the
  // shop layout), so the admin must read AND write that same key — writing to a
  // plain `announcement` key saved fine but never showed up on the site.
  const raw = asObj(getCms(cmsContent, 'site_announcement'))
  const [form, setForm] = useState({
    text: str(raw.text),
    background_color: str(raw.background_color) || '#000000',
    text_color: str(raw.text_color) || '#ffffff',
    link_url: str(raw.link_url),
    is_active: bool(raw.is_active, true),
  })
  // Standalone lines for the coupon ticker under the hero. Stored as an array
  // under the `marquee_lines` CMS key; the homepage renders them alongside the
  // active coupons (see CouponMarquee).
  const [lines, setLines] = useState<{ text: string; text_or: string }[]>(
    asArr<{ text: string; text_or: string }>(getCms(cmsContent, 'marquee_lines')),
  )
  const [saving, setSaving] = useState(false)

  const setLine = (i: number, field: 'text' | 'text_or', value: string) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, [field]: value } : l)))

  async function save() {
    setSaving(true)
    // Drop blank lines (no English text) so an empty row never reaches the site.
    const cleanLines = lines
      .map(l => ({ text: l.text.trim(), text_or: l.text_or.trim() }))
      .filter(l => l.text.length > 0)
    const [annRes, lineRes] = await Promise.all([
      fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'site_announcement', value: form }),
      }),
      fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'marquee_lines', value: cleanLines }),
      }),
    ])
    setSaving(false)
    const ok = annRes.ok && lineRes.ok
    onToast(ok ? 'Changes saved successfully' : 'Failed to save — please try again', ok ? 'success' : 'error')
  }

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Live preview */}
      <div className="space-y-3">
        <label className="font-bold text-xs text-primary">Live Preview</label>
        <div
          className="px-6 py-4 rounded-2xl text-center font-bold text-sm transition border-2 border-table-border shadow-sm"
          style={{ backgroundColor: form.background_color, color: form.text_color }}
        >
          {form.text || 'Announcement preview will appear here…'}
        </div>
      </div>

      <CmsSection title="Announcement Bar">
        <CmsField label="Text">
          <input type="text" value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} className={inputCls} placeholder="🎉 Free delivery on orders above ₹500!" />
        </CmsField>
        <div className="grid grid-cols-2 gap-6">
          <CmsField label="Background Color">
            <div className="flex gap-3 items-center">
              <div className="relative w-12 h-12 flex-shrink-0">
                <input type="color" value={form.background_color} onChange={e => setForm(p => ({ ...p, background_color: e.target.value }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="w-full h-full rounded-xl border-2 border-table-border pointer-events-none" style={{ backgroundColor: form.background_color }} />
              </div>
              <input type="text" value={form.background_color} onChange={e => setForm(p => ({ ...p, background_color: e.target.value }))} className={cn(inputCls, 'flex-1 font-mono')} />
            </div>
          </CmsField>
          <CmsField label="Text Color">
            <div className="flex gap-3 items-center">
               <div className="relative w-12 h-12 flex-shrink-0">
                <input type="color" value={form.text_color} onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="w-full h-full rounded-xl border-2 border-table-border pointer-events-none" style={{ backgroundColor: form.text_color }} />
              </div>
              <input type="text" value={form.text_color} onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))} className={cn(inputCls, 'flex-1 font-mono')} />
            </div>
          </CmsField>
        </div>
        <CmsField label="Link URL" hint="Optional — makes the bar clickable">
          <input type="text" value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} className={inputCls} placeholder="/products" />
        </CmsField>

        <div className="flex items-center justify-between gap-6 p-5 bg-surface-card rounded-2xl border-2 border-table-border max-w-sm">
          <div>
            <p className="font-bold text-xs text-primary">Active</p>
            <p className="font-bold text-[12px] text-on-surface-variant mt-1">Show on site</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
            className={cn('relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-colors active:scale-95', form.is_active ? 'bg-primary border-primary' : 'bg-surface border-table-border')}
          >
            <span className={cn('inline-block h-4 w-4 rounded-full shadow transition-transform', form.is_active ? 'translate-x-6 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50')} />
          </button>
        </div>
      </CmsSection>

      <CmsSection title="Ticker Lines">
        <p className="font-medium text-[11px] text-on-surface-variant/70 -mt-2">
          Custom lines that scroll in the ticker under the hero banner, alongside any active coupons.
          Leave empty to show only coupons.
        </p>

        {lines.map((line, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-3 items-start">
            <input
              type="text"
              value={line.text}
              onChange={e => setLine(i, 'text', e.target.value)}
              placeholder="English line — e.g. 🎉 Bahuda Offer: shop ₹11,000 & get 20% off"
              className={cn(inputCls, 'flex-1')}
            />
            <input
              type="text"
              value={line.text_or}
              onChange={e => setLine(i, 'text_or', e.target.value)}
              placeholder="Optional"
              className={cn(inputCls, 'flex-1')}
            />
            <button
              type="button"
              onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
              aria-label="Remove line"
              className="p-3 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition-colors active:scale-95 flex-shrink-0"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setLines(prev => [...prev, { text: '', text_or: '' }])}
          className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-table-border rounded-xl font-bold text-[12px] text-on-surface-variant hover:border-primary hover:text-primary transition-colors active:scale-[0.99]"
        >
          <Plus size={16} />
          Add Line
        </button>
      </CmsSection>

      <SaveBar saving={saving} onSave={save} />
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function CmsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <h3 className="font-bold text-xl text-primary tracking-tight border-b-2 border-table-border pb-3">{title}</h3>
      {children}
    </section>
  )
}

function CmsField({ label, hint, children, extraClass }: {
  label: string; hint?: string; children: React.ReactNode; extraClass?: string
}) {
  return (
    <div className={cn('space-y-2', extraClass)}>
      <label className="font-bold text-xs text-primary flex items-center">
        {label}
        {hint && <span className="font-bold text-[12px] text-on-surface-variant ml-3 normal-case tracking-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-6 border-t-2 border-table-border">
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center justify-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-opacity active:scale-95 shadow-sm"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}
