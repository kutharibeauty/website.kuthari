'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  horizontalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { Product, Category } from '@/types/database.types'

// ── Types ──────────────────────────────────────────────────────────────────────

type ImageItem = { id: string; url: string }

type FormState = {
  category_id: string
  name: string
  name_or: string
  brand: string
  sku: string
  slug: string
  is_active: boolean
  is_featured: boolean
  display_order: number
  price: string
  mrp: string
  unit: string
  unit_or: string
  stock_qty: string
  packaging_form: string
  pack_type: string
  units_per_pack: string
  pieces_per_secondary: string
  secondary_price: string
  secondary_mrp: string
  packs_per_box: string
  unit_type: string
  price_per_pack: string
  units_per_hanger: string
  hangers_per_pack: string
  delivery_charge: string
  delivery_charge_enabled: boolean
  variants: { label: string; price: string; mrp: string }[]
  description: string
  description_or: string
  meta_title: string
  meta_description: string
  tags: string[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

function generateSku(categoryName: string) {
  const cat = categoryName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(3, 'X')
  const year = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `KBS-${cat}-${year}-${seq}`
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

const TABS = [
  { label: 'Basic Info',       icon: 'info' },
  { label: 'Pricing & Stock',  icon: 'payments' },
  { label: 'Images',           icon: 'image' },
  { label: 'Description',      icon: 'description' },
  { label: 'SEO',              icon: 'search' },
  { label: 'Merchant',         icon: 'store' },
  { label: 'FAQ',              icon: 'quiz' },
  { label: 'Reviews',          icon: 'reviews' },
]

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProductForm({
  product,
  categories,
}: {
  product?: Product
  categories: Category[]
}) {
  const router = useRouter()
  const isEdit = !!product

  // Back / Cancel returns to the PREVIOUS entry — the products list, whose
  // filters/sort/page now live in the URL — so the exact view is restored.
  // Falls back to the plain list if there's no history (e.g. opened directly).
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/admin/products')
  }

  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)
  const [generatingSeo, setGeneratingSeo] = useState(false)
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [images, setImages] = useState<ImageItem[]>(
    (product?.images ?? []).map(url => ({ id: makeId(), url })),
  )
  const [uploading, setUploading] = useState(false)
  const [autoTranslatingName, setAutoTranslatingName] = useState(false)
  // Becomes true once the admin edits the Odia name themselves, so the
  // auto-translation below never overwrites a manual correction. Seeded true
  // when editing a product that already has an Odia name, so opening it doesn't
  // re-translate and clobber the saved value.
  const nameOrTouched = useRef(!!product?.name_or)
  // True once the admin actually edits the English name in this session. The
  // derived fields (slug, Odia name, meta title/description, keywords) then
  // follow the name even when editing an existing product — but NOT on open, so
  // a saved slug/SEO is never clobbered just by viewing the product.
  const nameEdited = useRef(false)

  const [form, setForm] = useState<FormState>({
    category_id: product?.category_id ?? '',
    name: product?.name ?? '',
    name_or: product?.name_or ?? '',
    brand: product?.brand ?? '',
    sku: product?.sku ?? '',
    slug: product?.slug ?? '',
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    display_order: product?.display_order ?? 0,
    price: product?.price?.toString() ?? '',
    mrp: product?.mrp?.toString() ?? '',
    unit: product?.unit ?? '',
    unit_or: product?.unit_or ?? '',
    stock_qty: product?.stock_qty?.toString() ?? '0',
    packaging_form: product?.packaging_form ?? '',
    pack_type: product?.pack_type ?? '',
    units_per_pack: product?.units_per_pack?.toString() ?? '',
    pieces_per_secondary: product?.pieces_per_secondary?.toString() ?? '',
    secondary_price: product?.secondary_price?.toString() ?? '',
    secondary_mrp: product?.secondary_mrp?.toString() ?? '',
    packs_per_box: product?.packs_per_box?.toString() ?? '',
    unit_type: product?.unit_type ?? '',
    price_per_pack: product?.price_per_pack?.toString() ?? '',
    units_per_hanger: product?.units_per_hanger?.toString() ?? '',
    hangers_per_pack: product?.hangers_per_pack?.toString() ?? '',
    delivery_charge: product?.delivery_charge != null ? product.delivery_charge.toString() : '',
    delivery_charge_enabled: product?.delivery_charge_enabled ?? false,
    variants: (product?.variants ?? []).map(v => ({
      label: v.label,
      price: v.price?.toString() ?? '',
      mrp: v.mrp != null ? v.mrp.toString() : '',
    })),
    description: product?.description ?? '',
    description_or: product?.description_or ?? '',
    meta_title: product?.meta_title ?? '',
    meta_description: product?.meta_description ?? '',
    tags: product?.tags ?? [],
  })

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  // How this product is packaged. It's a per-PRODUCT choice, not a per-category
  // one: the Spices category holds both ₹5 sachets on hangers (Box → Hanger →
  // Piece) and bigger 100gm/200gm/1kg sizes sold in packs (Box → Pack → Pieces).
  // Keying off the category forced every spice into the hanger model and made
  // the bigger sizes impossible to save.
  const selectedCategory = categories.find(c => c.id === form.category_id)
  const isSpiceCategory =
    /spice/i.test(selectedCategory?.name ?? '') || selectedCategory?.slug === 'spices'

  // An existing product is whatever its data already says it is; everything else
  // starts on the general Box → Pack → Pieces model and the admin switches to
  // hanger for sachet strips. Inferred from the data, so no product can silently
  // change model just by being opened.
  const [packagingModel, setPackagingModel] = useState<'hanger' | 'pack'>(() =>
    product?.units_per_hanger && product?.hangers_per_pack ? 'hanger' : 'pack',
  )
  const isHangerModel = packagingModel === 'hanger'

  // Box → Pack → Pieces has an OPTIONAL middle "pack" level. Off means the box
  // sells straight to pieces (e.g. oil: a box and its pieces, but no pack in
  // between). Existing products that already have a lower unit start on.
  const [hasPack, setHasPack] = useState<boolean>(() => !!product?.unit_type)

  // Enable/disable the pack level. Turning it off clears the pack fields so the
  // product saves as box → pieces; turning it on defaults the unit to "Pack".
  const setPackEnabled = useCallback((on: boolean) => {
    setHasPack(on)
    if (on) {
      setForm(prev => (prev.unit_type ? prev : { ...prev, unit_type: 'Pack' }))
    } else {
      setForm(prev => ({ ...prev, unit_type: '', units_per_pack: '', secondary_price: '', secondary_mrp: '' }))
    }
  }, [])

  // Auto-generate slug from name. New products always; existing products once
  // the admin actually edits the name (so a saved slug isn't clobbered on open).
  useEffect(() => {
    if (!isEdit || nameEdited.current) {
      set('slug', toSlug(form.name))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name])

  // Auto-translate the English name → Odia (name_or) as the admin types, using
  // the same AI model as the manual "Translate to Odia" button. Debounced so we
  // don't hit the API on every keystroke, and skipped once the admin edits the
  // Odia name by hand so a manual correction is never clobbered.
  useEffect(() => {
    const en = form.name.trim()
    if (!en || nameOrTouched.current) return
    const handle = setTimeout(async () => {
      try {
        setAutoTranslatingName(true)
        const res = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { name: en } }),
        })
        if (res.ok) {
          const { translations } = await res.json() as { translations?: Record<string, string> }
          // Apply only if the name hasn't changed since and the admin hasn't
          // started editing the Odia field in the meantime.
          if (translations?.name && !nameOrTouched.current) {
            setForm(prev => (prev.name.trim() === en ? { ...prev, name_or: translations.name } : prev))
          }
        }
      } catch {
        // Silent — the manual "Translate to Odia" button remains available.
      } finally {
        setAutoTranslatingName(false)
      }
    }, 900)
    return () => clearTimeout(handle)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name])

  // NOTE: the old "Selling Price = Price per Pack ÷ Units per Pack" auto-calc was
  // removed. `price` is now the price of one full box, entered directly; the
  // lower unit's price is derived from it (see lib/products/packaging.ts).


  // ── Image Upload ─────────────────────────────────────────────────────────────

  async function uploadImage(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const { url } = await res.json() as { url: string }
      setImages(prev => [...prev, { id: makeId(), url }])
    }
    setUploading(false)
  }

  // ── SEO Generation ───────────────────────────────────────────────────────────

  // `silent` = auto-run after a name edit: no toasts/errors, just refresh the
  // meta title/description/keywords in the background.
  async function generateSeo(opts: { silent?: boolean } = {}) {
    const silent = opts.silent === true
    if (!form.name.trim()) { if (!silent) setError('Enter a product name first'); return }
    setGeneratingSeo(true)
    if (!silent) setError(null)
    const catName = categories.find(c => c.id === form.category_id)?.name ?? ''
    try {
      const res = await fetch('/api/products/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description, category: catName }),
      })
      if (res.ok) {
        const data = await res.json() as { meta_title?: string; meta_description?: string; keywords?: string[] }
        if (data.meta_title) set('meta_title', data.meta_title)
        if (data.meta_description) set('meta_description', data.meta_description)
        if (data.keywords?.length) set('tags', data.keywords)
        if (!silent) showToast('SEO generated!')
      } else if (!silent) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setError(d.error ?? 'SEO generation failed')
        showToast(d.error ?? 'SEO generation failed', 'error')
      }
    } catch { if (!silent) showToast('SEO generation failed', 'error') }
    setGeneratingSeo(false)
  }

  // Auto-refresh meta title/description/keywords a moment after the admin edits
  // the name, so the SEO fields follow the product name. Debounced (one AI call
  // per pause), and only after a real name edit — never on open.
  useEffect(() => {
    if (!nameEdited.current || !form.name.trim()) return
    const handle = setTimeout(() => { void generateSeo({ silent: true }) }, 1400)
    return () => clearTimeout(handle)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name])

  // ── AI Description Generation (English + Odia) ────────────────────────────────

  async function generateDescription() {
    if (!form.name.trim()) { setError('Enter a product name first'); setTab(0); return }
    setGeneratingDesc(true)
    setError(null)
    const catName = categories.find(c => c.id === form.category_id)?.name ?? ''
    const res = await fetch('/api/products/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        category: catName,
        brand: form.brand.trim() || undefined,
        price: form.price ? parseFloat(form.price) : undefined,
        unit: form.unit.trim() || undefined,
        prompt: aiPrompt.trim() || undefined,
      }),
    })
    if (res.ok) {
      const data = await res.json() as { description?: string; description_or?: string }
      if (data.description) set('description', data.description)
      if (data.description_or) set('description_or', data.description_or)
      showToast('Description generated!')
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      setError(d.error ?? 'Description generation failed')
      showToast(d.error ?? 'Description generation failed', 'error')
    }
    setGeneratingDesc(false)
  }

  // ── AI Translate (English → Odia) ─────────────────────────────────────────────

  async function translateToOdia() {
    const fields: Record<string, string> = {}
    if (form.name.trim()) fields.name = form.name.trim()
    if (form.unit.trim()) fields.unit = form.unit.trim()
    if (form.description.trim()) fields.description = form.description
    if (form.meta_title.trim()) fields.meta_title = form.meta_title.trim()
    if (form.meta_description.trim()) fields.meta_description = form.meta_description.trim()
    if (Object.keys(fields).length === 0) { setError('Enter the English details first'); setTab(0); return }

    setTranslating(true)
    setError(null)
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
    if (res.ok) {
      const { translations } = await res.json() as { translations: Record<string, string> }
      if (translations.name) set('name_or', translations.name)
      if (translations.unit) set('unit_or', translations.unit)
      if (translations.description) set('description_or', translations.description)
      showToast('Translated to Odia!')
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      setError(d.error ?? 'Translation failed')
      showToast(d.error ?? 'Translation failed', 'error')
    }
    setTranslating(false)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError(null)

    if (!form.category_id) { setError('Category is required'); setTab(0); return }
    if (!form.name.trim()) { setError('Product name is required'); setTab(0); return }
    if (!form.price || parseFloat(form.price) <= 0) { setError('Price must be greater than 0'); setTab(1); return }
    if (!form.unit.trim()) { setError('Unit is required'); setTab(1); return }
    if (isHangerModel) {
      if (!form.units_per_hanger || parseInt(form.units_per_hanger, 10) <= 0) { setError('Pieces per hanger is required'); setTab(1); return }
      if (!form.hangers_per_pack || parseInt(form.hangers_per_pack, 10) <= 0) { setError('Hangers per box is required'); setTab(1); return }
    } else if (form.unit_type && (!form.units_per_pack || parseInt(form.units_per_pack, 10) <= 0)) {
      setError(`How many ${form.unit_type.toLowerCase()}s are in one ${(form.pack_type || 'box').toLowerCase()}? Enter a number, or clear the lower unit if the box is sold whole.`)
      setTab(1); return
    }

    setSaving(true)

    const payload = {
      category_id: form.category_id,
      name: form.name.trim(),
      name_or: form.name_or.trim() || null,
      brand: form.brand.trim() || null,
      sku: form.sku.trim() || null,
      slug: form.slug.trim() || toSlug(form.name),
      is_active: form.is_active,
      is_featured: form.is_featured,
      display_order: form.display_order,
      price: parseFloat(form.price),
      mrp: form.mrp ? parseFloat(form.mrp) : null,
      unit: form.unit.trim(),
      stock_qty: parseInt(form.stock_qty, 10) || 0,
      packaging_form: form.packaging_form.trim() || null,
      pack_type: form.pack_type || null,
      // The two models are mutually exclusive — whichever isn't in use is
      // written back as NULL. Leaving the other model's columns populated is how
      // products ended up claiming things like "1 Sachet = 1,200 pieces".
      units_per_pack: !isHangerModel && form.units_per_pack ? parseInt(form.units_per_pack, 10) : null,
      pieces_per_secondary: !isHangerModel && form.pieces_per_secondary ? parseInt(form.pieces_per_secondary, 10) : null,
      secondary_price: !isHangerModel && form.secondary_price ? parseFloat(form.secondary_price) : null,
      secondary_mrp: !isHangerModel && form.secondary_mrp ? parseFloat(form.secondary_mrp) : null,
      packs_per_box: !isHangerModel && form.packs_per_box ? parseInt(form.packs_per_box, 10) : null,
      unit_type: !isHangerModel && form.unit_type ? form.unit_type : null,
      price_per_pack: !isHangerModel && form.price_per_pack ? parseFloat(form.price_per_pack) : null,
      units_per_hanger: isHangerModel && form.units_per_hanger ? parseInt(form.units_per_hanger, 10) : null,
      hangers_per_pack: isHangerModel && form.hangers_per_pack ? parseInt(form.hangers_per_pack, 10) : null,
      // Per-product delivery charge. The amount is kept even when the toggle is
      // off (so re-enabling doesn't lose it); the flag controls whether it applies.
      delivery_charge: form.delivery_charge ? parseFloat(form.delivery_charge) : 0,
      delivery_charge_enabled: form.delivery_charge_enabled,
      // Hanger products don't use weight/size variants — the hanger/box levels
      // replace them.
      variants: isHangerModel ? [] : form.variants
        .filter(v => v.label.trim() && v.price !== '' && !isNaN(parseFloat(v.price)))
        .map(v => ({
          label: v.label.trim(),
          price: parseFloat(v.price),
          mrp: v.mrp !== '' && !isNaN(parseFloat(v.mrp)) ? parseFloat(v.mrp) : null,
        })),
      images: images.map(i => i.url),
      description: form.description || null,
      description_or: form.description_or || null,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      tags: form.tags,
    }

    const url = isEdit ? `/api/products/${product.id}` : '/api/products'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      if (!isEdit) {
        const data = await res.json() as { id: string }
        showToast('Product created successfully')
        router.push(`/admin/products/${data.id}`)
      } else {
        showToast('Changes saved successfully')
        // Re-fetch the server component so the Router Cache holds the freshly
        // saved values — otherwise navigating away and back re-hydrates the
        // form from a stale cached page and the edits appear to vanish.
        router.refresh()
      }
    } else {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Failed to save product')
    }

    setSaving(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Header ── */}
      <div className="sticky top-16 z-30 bg-surface border-b-2 border-table-border px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to products"
            className="p-2.5 rounded-xl border-2 border-table-border bg-surface-card hover:bg-surface-container-low transition-colors text-primary active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight capitalize">
              {isEdit ? form.name || 'Edit Product' : 'New Product.'}
            </h1>
            {isEdit && (
              <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">{product.sku ?? 'No SKU'}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="px-5 py-2.5 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant font-black text-xs uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-opacity disabled:opacity-60 active:scale-95 shadow-sm"
          >
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-margin-mobile md:mx-margin-desktop mt-4 flex items-center gap-3 px-4 py-3 bg-error/10 border border-error/20 rounded-xl text-error font-body-md text-body-md">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><span className="material-symbols-outlined text-[16px]">close</span></button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="sticky top-[calc(4rem+89px)] md:top-[calc(4rem+73px)] z-20 bg-surface border-b-2 border-table-border shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="px-4 md:px-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 py-3 min-w-max">
            {TABS.map((t, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap',
                  tab === i
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-surface-card border-table-border text-on-surface-variant hover:border-primary/40 hover:text-primary',
                )}
              >
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: tab === i ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 p-4 md:p-8 max-w-[900px] mx-auto w-full pb-12">

        {/* Tab 0: Basic Info */}
        {tab === 0 && (
          <div className="space-y-6">
            <Field label="Category" required>
              <select
                value={form.category_id}
                onChange={e => set('category_id', e.target.value)}
                className={inputCls}
              >
                <option value="">Select a category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Product Name (English)" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => {
                    // Editing the name re-derives everything that follows from
                    // it. Clear nameOrTouched so the Odia name re-translates too.
                    nameEdited.current = true
                    nameOrTouched.current = false
                    set('name', e.target.value)
                  }}
                  placeholder="e.g. Sunflower Oil 5L"
                  className={inputCls}
                />
              </Field>
              <Field label="Product Name (Odia)" hint={autoTranslatingName ? 'Translating…' : 'Auto-translated from the English name'}>
                <input
                  type="text"
                  value={form.name_or}
                  onChange={e => { nameOrTouched.current = true; set('name_or', e.target.value) }}
                  placeholder="ଓଡ଼ିଆ ନାମ…"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="SKU">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.sku}
                    onChange={e => set('sku', e.target.value)}
                    placeholder="e.g. KBS-SKN-2026-0001"
                    className={cn(inputCls, 'flex-1')}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const catName = categories.find(c => c.id === form.category_id)?.name ?? 'GEN'
                      set('sku', generateSku(catName))
                    }}
                    className="px-3 py-2 bg-surface-container-high text-on-surface rounded-xl font-body-md text-body-md hover:bg-surface-container-highest transition-colors whitespace-nowrap"
                  >
                    Auto
                  </button>
                </div>
              </Field>
              <Field label="Slug">
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => set('slug', e.target.value)}
                  placeholder="product-slug"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Brand" hint="Manufacturer / brand label">
                <input
                  type="text"
                  value={form.brand}
                  onChange={e => set('brand', e.target.value)}
                  placeholder="e.g. Ruchigold"
                  className={inputCls}
                />
              </Field>
              <Field label="Display Order">
                <input
                  type="number"
                  value={form.display_order}
                  min={0}
                  onChange={e => set('display_order', parseInt(e.target.value, 10) || 0)}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-6">
              <ToggleField
                label="Active"
                sub="Visible in the shop"
                checked={form.is_active}
                onChange={v => set('is_active', v)}
              />
              <ToggleField
                label="Featured"
                sub="Show in featured section"
                checked={form.is_featured}
                onChange={v => set('is_featured', v)}
              />
            </div>
          </div>
        )}

        {/* Tab 1: Pricing & Stock */}
        {tab === 1 && (
          <div className="space-y-6">
            {/* Packaging model — a per-product choice. The Spices category holds
                both ₹5 sachet strips and bigger 100gm/1kg sizes, and they are
                packaged differently. */}
            <div className="p-5 bg-surface-card rounded-2xl border-2 border-table-border space-y-3">
              <div>
                <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest">Packaging</p>
                <p className="font-medium text-[11px] text-on-surface-variant/70 mt-1">
                  How is this product packed? The customer buys the whole box, or one of the smaller units inside it.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { id: 'pack' as const, title: 'Box → Pack → Pieces', sub: 'Bigger sizes. e.g. 1 box = 10 packs, 1 pack = 10 pieces. Customer buys a whole box or a number of packs.' },
                  { id: 'hanger' as const, title: 'Box → Hanger → Piece', sub: 'Sachet strips. e.g. 1 box = 20 hangers, 1 hanger = 60 pieces. Customer buys a whole box or hangers.' },
                ]).map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setPackagingModel(o.id)}
                    aria-pressed={packagingModel === o.id}
                    className={cn(
                      'text-left rounded-xl border-2 p-3 transition-all active:scale-[0.98]',
                      packagingModel === o.id
                        ? 'border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(27, 44, 61,0.06)]'
                        : 'border-table-border hover:border-primary/40',
                    )}
                  >
                    <span className="block font-black text-[12px] text-primary">{o.title}</span>
                    <span className="block font-medium text-[10px] text-on-surface-variant/70 mt-1 leading-snug">{o.sub}</span>
                  </button>
                ))}
              </div>
              {isSpiceCategory && !isHangerModel && (
                <p className="text-[10px] font-bold text-on-surface-variant/60">
                  Tip: ₹5 / ₹10 sachet strips usually use Box → Hanger → Piece.
                </p>
              )}
            </div>

            {isHangerModel && (
              <div className="p-5 bg-primary/5 rounded-2xl border-2 border-primary/20 space-y-4">
                <div>
                  <p className="font-black text-[10px] text-primary uppercase tracking-widest">Spices — Box → Hanger → Piece</p>
                  <p className="font-medium text-[11px] text-on-surface-variant mt-1">
                    The customer buys a whole <b>box</b> or individual <b>hangers</b> (never single pieces). Set how many pieces make a hanger and how many hangers make a box. The <b>Selling Price below is the price per hanger</b> — the box price is calculated automatically.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Pieces per Hanger" required hint="How many pieces are in one hanger">
                    <input
                      type="number" min={1}
                      value={form.units_per_hanger}
                      onChange={e => set('units_per_hanger', e.target.value)}
                      placeholder="e.g. 60"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Hangers per Box" required hint="How many hangers make one box">
                    <input
                      type="number" min={1}
                      value={form.hangers_per_pack}
                      onChange={e => set('hangers_per_pack', e.target.value)}
                      placeholder="e.g. 20"
                      className={inputCls}
                    />
                  </Field>
                </div>
                {form.price && form.units_per_hanger && form.hangers_per_pack && (
                  <p className="text-[11px] font-bold text-primary">
                    1 hanger = ₹{parseFloat(form.price || '0').toFixed(2)} · {form.units_per_hanger} pieces &nbsp;|&nbsp;
                    1 box = ₹{(parseFloat(form.price || '0') * parseInt(form.hangers_per_pack || '0', 10)).toFixed(2)} · {parseInt(form.units_per_hanger || '0', 10) * parseInt(form.hangers_per_pack || '0', 10)} pieces ({form.hangers_per_pack} hangers)
                  </p>
                )}
              </div>
            )}

            {!isHangerModel && (
            <div className="p-5 bg-surface-card rounded-2xl border-2 border-table-border space-y-6">
              <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest">
                Wholesale Pack Details
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Packaging Form" hint='e.g. "Pouch", "Tin" — leave blank if N/A'>
                  <input
                    type="text"
                    value={form.packaging_form}
                    onChange={e => set('packaging_form', e.target.value)}
                    placeholder="e.g. Pouch, Tin"
                    className={inputCls}
                  />
                </Field>
                <Field label="Pack Type" hint="How the product is sold">
                  <select
                    value={form.pack_type}
                    onChange={e => set('pack_type', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    <option value="Box">Box</option>
                    <option value="Box/Bale">Box/Bale</option>
                    <option value="Pack">Pack</option>
                    <option value="Bag">Bag</option>
                    <option value="Tin/Can">Tin/Can</option>
                    <option value="Hanger">Hanger</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Piece">Piece</option>
                  </select>
                </Field>
              </div>

              {/* Optional middle level. Off = box → pieces (oil, ghee tins);
                  on = box → pack → pieces (masala, sachet cartons). */}
              <ToggleField
                label="Sell packs inside the box"
                sub={`On: the ${(form.pack_type || 'box').toLowerCase()} also splits into packs (e.g. 1 box = 10 packs). Off: sold as a whole ${(form.pack_type || 'box').toLowerCase()} → pieces, like oil.`}
                checked={hasPack}
                onChange={setPackEnabled}
              />

              {hasPack && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Lower Unit" hint="The smaller unit a customer can also buy inside the box">
                  <select
                    value={form.unit_type || 'Pack'}
                    onChange={e => set('unit_type', e.target.value)}
                    className={inputCls}
                  >
                    <option value="Pack">Pack</option>
                    <option value="Hanger">Hanger</option>
                    <option value="Tin">Tin</option>
                    <option value="Pouch">Pouch</option>
                    <option value="Packet">Packet</option>
                    <option value="Sachet">Sachet</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Bottle/Pouch">Bottle/Pouch</option>
                    <option value="Bag">Bag</option>
                    <option value="Jar">Jar</option>
                    <option value="Piece">Piece</option>
                  </select>
                </Field>
                <Field label={`${form.unit_type || 'Pack'}s per ${form.pack_type || 'Box'}`} hint={`How many ${(form.unit_type || 'pack').toLowerCase()}s are in one ${(form.pack_type || 'box').toLowerCase()}`}>
                  <input
                    type="number"
                    value={form.units_per_pack}
                    min={1}
                    onChange={e => set('units_per_pack', e.target.value)}
                    placeholder="e.g. 10"
                    className={inputCls}
                  />
                </Field>
              </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field
                  label={form.unit_type ? `Pieces per ${form.unit_type}` : `Pieces per ${form.pack_type || 'Box'}`}
                  hint={form.unit_type ? `How many pieces are inside one ${form.unit_type.toLowerCase()}` : 'How many pieces are inside one box'}
                >
                  <input
                    type="number"
                    value={form.pieces_per_secondary}
                    min={1}
                    onChange={e => set('pieces_per_secondary', e.target.value)}
                    placeholder="e.g. 60"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Live total — exactly what the customer will see. */}
              {(() => {
                const per = parseInt(form.units_per_pack || '0', 10)
                const each = parseInt(form.pieces_per_secondary || '0', 10)
                const box = form.pack_type || 'Box'
                if (form.unit_type && per > 0 && each > 0) {
                  return (
                    <p className="text-[11px] font-bold text-primary bg-primary/5 border-2 border-primary/15 rounded-xl px-4 py-2.5">
                      1 {box} = {per} {form.unit_type}s × {each} pieces = <b>{(per * each).toLocaleString('en-IN')} pieces</b>
                      {' · '}1 {form.unit_type} = <b>{each} pieces</b>
                    </p>
                  )
                }
                if (!form.unit_type && each > 0) {
                  return (
                    <p className="text-[11px] font-bold text-primary bg-primary/5 border-2 border-primary/15 rounded-xl px-4 py-2.5">
                      1 {box} = <b>{each.toLocaleString('en-IN')} pieces</b>
                    </p>
                  )
                }
                return (
                  <p className="text-[11px] font-bold text-on-surface-variant/60">
                    Fill the counts above to see the total pieces per {box.toLowerCase()}.
                  </p>
                )
              })()}

              {/* Optional price for the lower unit. */}
              {form.unit_type && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label={`Price per ${form.unit_type} (₹)`} hint="Optional — leave blank to split the box price evenly">
                    <input
                      type="number" min={0} step="0.01"
                      value={form.secondary_price}
                      onChange={e => set('secondary_price', e.target.value)}
                      placeholder={form.price && form.units_per_pack ? (parseFloat(form.price) / parseInt(form.units_per_pack, 10)).toFixed(2) : '0.00'}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={`MRP per ${form.unit_type} (₹)`} hint="Optional — strikethrough price for one unit">
                    <input
                      type="number" min={0} step="0.01"
                      value={form.secondary_mrp}
                      onChange={e => set('secondary_mrp', e.target.value)}
                      placeholder="e.g. 250.00"
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}

            </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                label={isHangerModel ? 'Price per Hanger (₹)' : `Selling Price per ${form.pack_type || 'Box'} (₹)`}
                required
                hint={isHangerModel ? undefined : 'What the customer pays for one full box'}
              >
                <input
                  type="number"
                  value={form.price}
                  min={0}
                  step="0.01"
                  onChange={e => set('price', e.target.value)}
                  placeholder="e.g. 250.00"
                  className={inputCls}
                />
              </Field>
              <Field label={isHangerModel ? 'MRP (₹)' : `MRP per ${form.pack_type || 'Box'} (₹)`} hint="Optional — shows as strikethrough when set">
                <input
                  type="number"
                  value={form.mrp}
                  min={0}
                  step="0.01"
                  onChange={e => set('mrp', e.target.value)}
                  placeholder="e.g. 300.00"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Unit (English)" required hint='e.g. "1 kg", "5 L", "500 g"'>
                <input
                  type="text"
                  value={form.unit}
                  onChange={e => set('unit', e.target.value)}
                  placeholder="e.g. 1 kg"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* ── Weight / Size Variants (not for spices — they use hanger/pack) ── */}
            {!isHangerModel && (
            <div className="space-y-3 rounded-2xl border-2 border-table-border bg-surface-card p-5">
              <div>
                <p className="font-black text-xs text-primary uppercase tracking-widest">Weight / Size Variants</p>
                <p className="font-medium text-[11px] text-on-surface-variant mt-1">
                  Optional — add options like <b>5kg</b> / <b>10kg</b>, each with its own price. Customers pick one on the product page. Leave empty for a single-price product.
                </p>
              </div>

              {form.variants.map((v, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={v.label}
                    onChange={e => set('variants', form.variants.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    placeholder="Label (e.g. 10kg)"
                    className={cn(inputCls, 'flex-1 min-w-[120px]')}
                  />
                  <input
                    type="number" min={0} step="0.01"
                    value={v.price}
                    onChange={e => set('variants', form.variants.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                    placeholder="Price ₹"
                    className={cn(inputCls, 'w-28')}
                  />
                  <input
                    type="number" min={0} step="0.01"
                    value={v.mrp}
                    onChange={e => set('variants', form.variants.map((x, j) => j === i ? { ...x, mrp: e.target.value } : x))}
                    placeholder="MRP ₹"
                    className={cn(inputCls, 'w-28')}
                  />
                  <button
                    type="button"
                    onClick={() => set('variants', form.variants.filter((_, j) => j !== i))}
                    className="p-2.5 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition-colors active:scale-95"
                    title="Remove variant"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => set('variants', [...form.variants, { label: '', price: '', mrp: '' }])}
                className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-table-border rounded-xl font-black text-[10px] text-on-surface-variant uppercase tracking-widest hover:border-primary hover:text-primary transition-colors active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Variant
              </button>
            </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label={isHangerModel ? 'Stock Quantity (in units)' : 'Stock Quantity'} required>
                <input
                  type="number"
                  value={form.stock_qty}
                  min={0}
                  onChange={e => set('stock_qty', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Per-product delivery charge — toggle on/off, set the amount. */}
            <div className="p-5 bg-surface-card rounded-2xl border-2 border-table-border space-y-4">
              <ToggleField
                label="Delivery Charge"
                sub="Charge a delivery fee for this product. Off = no delivery charge."
                checked={form.delivery_charge_enabled}
                onChange={v => set('delivery_charge_enabled', v)}
              />
              {form.delivery_charge_enabled && (
                <Field label="Delivery Charge (₹)" hint="Amount added for delivering this product">
                  <input
                    type="number" min={0} step="0.01"
                    value={form.delivery_charge}
                    onChange={e => set('delivery_charge', e.target.value)}
                    placeholder="e.g. 40.00"
                    className={inputCls}
                  />
                </Field>
              )}
            </div>

            {/* Price preview */}
            {form.price && (
              <div className="p-5 bg-surface-card rounded-2xl border-2 border-table-border">
                <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest mb-3">Price Preview</p>
                <div className="flex items-baseline gap-3">
                  <span className="font-black text-2xl text-primary tracking-tight">₹{parseFloat(form.price).toFixed(2)}</span>
                  {form.mrp && parseFloat(form.mrp) > parseFloat(form.price) && (
                    <>
                      <span className="font-bold text-sm text-on-surface-variant line-through">₹{parseFloat(form.mrp).toFixed(2)}</span>
                      <span className="px-2.5 py-1 bg-primary text-white rounded-lg font-black text-[10px] uppercase tracking-widest">
                        {Math.round((1 - parseFloat(form.price) / parseFloat(form.mrp)) * 100)}% off
                      </span>
                    </>
                  )}
                  {form.unit && <span className="font-bold text-sm text-on-surface-variant">/ {form.unit}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Images */}
        {tab === 2 && (
          <div className="space-y-6">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Upload up to 8 images. Drag to reorder — the first image is the primary (shown on product cards).
            </p>
            <ImageUploader images={images} onChange={setImages} uploading={uploading} onUpload={uploadImage} />
          </div>
        )}

        {/* Tab 3: Description */}
        {tab === 3 && (
          <div className="space-y-8">
            {/* ── AI generator ── */}
            <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
                <h3 className="font-black text-sm text-primary uppercase tracking-widest">Generate with AI</h3>
              </div>
              <p className="font-medium text-xs text-on-surface-variant">
                Writes the English &amp; Odia descriptions from the product details. Add an optional prompt to steer the tone or points to highlight.
              </p>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                rows={2}
                placeholder="Optional prompt — e.g. 'emphasise cold-pressed, great for restaurants, mention 15L bulk pack'"
                className="w-full px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-medium text-sm text-primary placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary transition-colors resize-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={generatingDesc || translating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60 transition-all active:scale-95 shadow-sm"
                >
                  <span className={`material-symbols-outlined text-[16px] ${generatingDesc ? 'animate-spin' : ''}`}>
                    {generatingDesc ? 'progress_activity' : 'auto_awesome'}
                  </span>
                  {generatingDesc ? 'Generating…' : 'Generate Description'}
                </button>
                <button
                  type="button"
                  onClick={translateToOdia}
                  disabled={translating || generatingDesc}
                  title="Fill the Odia (ଓଡ଼ିଆ) versions of name, unit and description from the English fields using AI"
                  className="flex items-center gap-2 px-5 py-2.5 bg-surface-card border-2 border-primary/30 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-primary/60 disabled:opacity-60 transition-all active:scale-95"
                >
                  <span className={`material-symbols-outlined text-[16px] ${translating ? 'animate-spin' : ''}`}>
                    {translating ? 'progress_activity' : 'translate'}
                  </span>
                  {translating ? 'Translating…' : 'Translate to Odia'}
                </button>
              </div>
            </div>

            <Field label="Full Description (English)">
              <RichTextEditor
                content={form.description}
                onChange={v => set('description', v)}
                placeholder="Describe the product in detail…"
              />
            </Field>
            <Field label="Full Description (Odia)">
              <RichTextEditor
                content={form.description_or}
                onChange={v => set('description_or', v)}
                placeholder="ଓଡ଼ିଆ ବିବରଣ…"
              />
            </Field>
          </div>
        )}

        {/* Tab 4: SEO */}
        {tab === 4 && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-xl text-primary tracking-tight">SEO Settings</h3>
                <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
                  Controls how this product appears in search results.
                </p>
              </div>
              <button
                onClick={() => generateSeo()}
                disabled={generatingSeo}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-card border-2 border-table-border text-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-primary/40 transition-all disabled:opacity-60 active:scale-95"
              >
                {generatingSeo
                  ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  : <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                }
                {generatingSeo ? 'Generating…' : 'Generate SEO'}
              </button>
            </div>

            <Field label={`Meta Title`} hint={`${form.meta_title.length}/60 characters`}>
              <input
                type="text"
                value={form.meta_title}
                maxLength={60}
                onChange={e => set('meta_title', e.target.value)}
                placeholder={form.name || 'Product meta title…'}
                className={cn(inputCls, form.meta_title.length > 55 && 'border-amber-400')}
              />
            </Field>

            <Field label="Meta Description" hint={`${form.meta_description.length}/160 characters`}>
              <textarea
                value={form.meta_description}
                maxLength={160}
                rows={3}
                onChange={e => set('meta_description', e.target.value)}
                placeholder="Brief description for search results…"
                className={cn(inputCls, 'resize-none', form.meta_description.length > 150 && 'border-amber-400')}
              />
            </Field>

            <Field label="Keywords">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {form.tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1.5 px-3 py-1 bg-surface-card border-2 border-table-border text-primary rounded-lg font-black text-[10px] uppercase tracking-widest"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => set('tags', form.tags.filter(t => t !== tag))}
                        className="hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                        e.preventDefault()
                        const t = tagInput.trim().replace(/,$/, '')
                        if (t && !form.tags.includes(t)) set('tags', [...form.tags, t])
                        setTagInput('')
                      }
                    }}
                    placeholder="Type keyword and press Enter…"
                    className={cn(inputCls, 'flex-1')}
                  />
                </div>
              </div>
            </Field>

            {/* SEO Preview */}
            <div>
              <p className="font-black text-[10px] text-on-surface-variant mb-3 uppercase tracking-widest">Google Preview</p>
              <div className="p-5 border-2 border-table-border rounded-xl bg-surface space-y-1 max-w-xl">
                <p className="text-[#1a0dab] text-lg font-bold truncate">
                  {form.meta_title || form.name || 'Product Title'}
                </p>
                <p className="text-[#006621] font-bold text-xs">
                  kutharibeauty.com/products/{form.slug || 'product-slug'}
                </p>
                <p className="text-sm font-medium text-on-surface-variant line-clamp-2 mt-1">
                  {form.meta_description || form.description?.replace(/<[^>]*>/g, '').slice(0, 160) || 'Product description will appear here…'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Google Merchant */}
        {tab === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-black text-xl text-primary tracking-tight">Google Merchant Center</h3>
              <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
                Data pulled from Basic Info and Pricing tabs and fed into Google Shopping.
              </p>
            </div>

            <div className="p-6 bg-surface-card rounded-2xl border-2 border-table-border space-y-4">
              <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest">Shopping Preview</p>
              <div className="flex gap-4">
                {images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[0].url} alt="" className="w-24 h-24 rounded-xl object-cover flex-shrink-0 border-2 border-table-border" />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-surface border-2 border-table-border flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant/40">image</span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-lg text-primary">{form.name || 'Product Name'}</p>
                  <p className="font-black text-2xl text-primary tracking-tight mt-1">
                    {form.price ? `₹${parseFloat(form.price).toFixed(2)}` : '—'}
                  </p>
                  <p className="font-black text-[10px] uppercase tracking-widest text-on-surface-variant mt-2">{form.brand || 'Kuthari Beauty Store'}</p>
                </div>
              </div>
            </div>

            {isEdit && (
              <a
                href={`/api/merchant-feed?product_id=${product.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-card border-2 border-table-border text-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-primary/40 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                View Merchant Feed
              </a>
            )}
          </div>
        )}

        {/* Tab 6: FAQ */}
        {tab === 6 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-black text-xl text-primary tracking-tight">FAQ</h3>
              <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
                Manage frequently asked questions for this product.
              </p>
            </div>
            {isEdit ? (
              <Link
                href={`/admin/products/${product.id}/faq`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-opacity active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">quiz</span>
                Manage FAQs
              </Link>
            ) : (
              <p className="font-bold text-sm text-on-surface-variant italic">
                Save the product first to manage FAQs.
              </p>
            )}
          </div>
        )}

        {/* Tab 7: Reviews */}
        {tab === 7 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-black text-xl text-primary tracking-tight">Reviews</h3>
              <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
                Approve and manage customer reviews for this product.
              </p>
            </div>
            {isEdit ? (
              <Link
                href={`/admin/products/${product.id}/reviews`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-opacity active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">reviews</span>
                Manage Reviews
              </Link>
            ) : (
              <p className="font-bold text-sm text-on-surface-variant italic">
                Save the product first to manage reviews.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Toast ── */}
    </div>
  )
}

// ── Field wrapper ──────────────────────────────────────────────────────────────

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="font-black text-xs text-primary uppercase tracking-widest flex items-center">
        {label}
        {required && <span className="text-error ml-1">*</span>}
        {hint && <span className="font-bold text-[10px] text-on-surface-variant ml-3 normal-case tracking-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

// ── Toggle field ───────────────────────────────────────────────────────────────

function ToggleField({
  label, sub, checked, onChange,
}: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 p-5 bg-surface-card rounded-2xl border-2 border-table-border min-w-[240px]">
      <div>
        <p className="font-black text-xs text-primary uppercase tracking-widest">{label}</p>
        <p className="font-bold text-[10px] text-on-surface-variant mt-1">{sub}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-colors active:scale-95',
          checked ? 'bg-primary border-primary' : 'bg-surface border-table-border',
        )}
      >
        <span className={cn('inline-block h-4 w-4 rounded-full shadow transition-transform', checked ? 'translate-x-6 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50')} />
      </button>
    </div>
  )
}

// ── Rich Text Editor (TipTap) ──────────────────────────────────────────────────

function RichTextEditor({
  content, onChange, placeholder,
}: { content: string; onChange: (html: string) => void; placeholder?: string }) {
  // Tracks the HTML we last synced, so external content changes (e.g. AI
  // generation) push into the editor without looping against onUpdate.
  const lastContent = useRef(content)
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none text-on-surface font-body-md text-body-md',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      lastContent.current = html
      onChange(html)
    },
  })

  // When `content` changes from outside (AI fill / reset), reflect it in the editor.
  useEffect(() => {
    if (!editor) return
    if (content !== lastContent.current) {
      lastContent.current = content
      if (content !== editor.getHTML()) {
        editor.commands.setContent(content || '', { emitUpdate: false })
      }
    }
  }, [content, editor])

  return (
    <div className="border-2 border-table-border rounded-xl bg-surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b-2 border-table-border bg-surface-card">
        <TipTapBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={!!editor?.isActive('bold')} icon="format_bold" title="Bold" />
        <TipTapBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={!!editor?.isActive('italic')} icon="format_italic" title="Italic" />
        <TipTapBtn onClick={() => editor?.chain().focus().toggleStrike().run()} active={!!editor?.isActive('strike')} icon="strikethrough_s" title="Strike" />
        <div className="w-px h-4 bg-outline-variant mx-1" />
        <TipTapBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={!!editor?.isActive('heading', { level: 2 })} icon="title" title="Heading" />
        <TipTapBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={!!editor?.isActive('bulletList')} icon="format_list_bulleted" title="Bullet list" />
        <TipTapBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={!!editor?.isActive('orderedList')} icon="format_list_numbered" title="Numbered list" />
        <div className="w-px h-4 bg-outline-variant mx-1" />
        <TipTapBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} active={false} icon="horizontal_rule" title="Divider" />
        <TipTapBtn onClick={() => editor?.chain().focus().undo().run()} active={false} icon="undo" title="Undo" />
        <TipTapBtn onClick={() => editor?.chain().focus().redo().run()} active={false} icon="redo" title="Redo" />
      </div>
      {!editor?.getText() && !content && (
        <div className="absolute pointer-events-none p-5 font-bold text-sm text-on-surface-variant">
          {placeholder}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}

function TipTapBtn({ onClick, active, icon, title }: { onClick: () => void; active: boolean; icon: string; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'p-1.5 rounded-lg border-2 transition-colors active:scale-95',
        active ? 'bg-primary border-primary text-white shadow-sm' : 'bg-surface border-transparent text-on-surface-variant hover:border-table-border hover:bg-surface-card',
      )}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  )
}

// ── Image Uploader with DnD ────────────────────────────────────────────────────

function ImageUploader({
  images, onChange, uploading, onUpload,
}: {
  images: ImageItem[]
  onChange: (items: ImageItem[]) => void
  uploading: boolean
  onUpload: (file: File) => Promise<void>
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const oldIdx = images.findIndex(i => i.id === active.id)
      const newIdx = images.findIndex(i => i.id === over.id)
      onChange(arrayMove(images, oldIdx, newIdx))
    }
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={images.map(i => i.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <SortableImage
                key={img.id}
                id={img.id}
                url={img.url}
                isPrimary={idx === 0}
                onDelete={() => onChange(images.filter(i => i.id !== img.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {images.length < 8 && (
        <label className={cn(
          'flex items-center gap-4 px-6 py-8 border-2 border-dashed border-table-border bg-surface-card rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.99]',
          uploading && 'opacity-50 pointer-events-none',
        )}>
          <div className="p-3 bg-surface border-2 border-table-border rounded-xl">
            <span className="material-symbols-outlined text-primary text-[28px]">cloud_upload</span>
          </div>
          <div>
            <p className="font-bold text-sm text-primary">
              {uploading ? 'Uploading…' : 'Click to upload images'}
            </p>
            <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
              {images.length}/8 images · PNG, JPG, WebP
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={async e => {
              const files = Array.from(e.target.files ?? []).slice(0, 8 - images.length)
              for (const f of files) await onUpload(f)
              e.target.value = ''
            }}
          />
        </label>
      )}

      {images.length > 0 && (
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Drag images to reorder · First image is shown on product cards
        </p>
      )}
    </div>
  )
}

function SortableImage({
  id, url, isPrimary, onDelete,
}: { id: string; url: string; isPrimary: boolean; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative group', isDragging && 'opacity-50')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="w-28 h-28 rounded-xl object-cover cursor-grab active:cursor-grabbing border-2 border-table-border"
        {...attributes}
        {...listeners}
      />
      {isPrimary && (
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-primary text-on-primary font-label-sm text-label-sm rounded text-[10px]">
          Primary
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-1 right-1 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <span className="material-symbols-outlined text-[12px]">close</span>
      </button>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────────

// Placeholders must not read as filled-in values. Without overriding the weight
// and dimming the colour, an example like "Pouch" or "10" renders in the same
// bold dark text as a real entry, and the admin can't tell an empty required
// field from a completed one.
const inputCls = 'w-full px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary placeholder:font-medium placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors'
