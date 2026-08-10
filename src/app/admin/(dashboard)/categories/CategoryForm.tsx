'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { Category } from '@/types/database.types'
import { ArrowLeft, Loader2, AlertCircle, X, CloudUpload, Bold, Italic, List, ListOrdered } from 'lucide-react'

const inputCls = 'w-full px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary placeholder:font-medium placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors'

function toSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

type FormState = {
  name: string
  name_or: string
  slug: string
  icon: string
  display_order: number
  is_active: boolean
  parent_id: string
  image_url: string
  description: string
  description_or: string
  meta_title: string
  meta_description: string
}

export default function CategoryForm({
  category,
  allCategories,
}: {
  category?: Category
  allCategories: Category[]
}) {
  const router = useRouter()
  const isEdit = !!category

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [translating, setTranslating] = useState(false)

  async function translateToOdia() {
    const fields: Record<string, string> = {}
    if (form.name.trim()) fields.name = form.name.trim()
    if (form.description.trim()) fields.description = form.description.trim()
    if (Object.keys(fields).length === 0) { setError('Enter the English name first'); return }
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
      if (translations.description) set('description_or', translations.description)
      showToast('Translated to Odia!')
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      setError(d.error ?? 'Translation failed')
      showToast(d.error ?? 'Translation failed', 'error')
    }
    setTranslating(false)
  }

  const [form, setForm] = useState<FormState>({
    name: category?.name ?? '',
    name_or: category?.name_or ?? '',
    slug: category?.slug ?? '',
    icon: category?.icon ?? '',
    display_order: category?.display_order ?? 0,
    is_active: category?.is_active ?? true,
    parent_id: category?.parent_id ?? '',
    image_url: category?.image_url ?? '',
    description: '',
    description_or: '',
    meta_title: '',
    meta_description: '',
  })

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    if (!isEdit) set('slug', toSlug(form.name))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name])


  async function uploadImage(file: File, field: 'image_url') {
    setUploadingImage(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const { url } = await res.json() as { url: string }
      set(field, url)
    }
    setUploadingImage(false)
  }

  async function handleSave() {
    setError(null)
    if (!form.name.trim()) { setError('Category name is required'); return }

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      name_or: form.name_or.trim() || null,
      slug: form.slug.trim() || toSlug(form.name),
      icon: form.icon.trim() || null,
      display_order: form.display_order,
      is_active: form.is_active,
      parent_id: form.parent_id || null,
      image_url: form.image_url || null,
      description: form.description || null,
      description_or: form.description_or || null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
    }

    const url = isEdit ? `/api/categories/${category.id}` : '/api/categories'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      if (!isEdit) {
        showToast('Category created successfully')
        router.push('/admin/categories')
      } else {
        showToast('Changes saved successfully')
      }
    } else {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Failed to save')
    }

    setSaving(false)
  }

  const parentOptions = allCategories.filter(c => c.id !== category?.id)

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Header ── */}
      <div className="sticky top-16 z-30 bg-surface border-b-2 border-table-border px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/categories"
            className="p-2.5 rounded-xl border-2 border-table-border bg-surface-card hover:bg-surface-container-low transition-colors text-primary active:scale-95"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight capitalize">
              {isEdit ? form.name || 'Edit Category' : 'New Category.'}
            </h1>
            {isEdit && (
              <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">/{category.slug}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/categories"
            className="px-5 py-2.5 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant font-black text-xs uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-all active:scale-95"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-opacity disabled:opacity-60 active:scale-95 shadow-sm"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-4 md:mx-8 mt-6 flex items-center gap-3 px-5 py-4 bg-error/10 border-2 border-error/20 rounded-xl text-error font-bold text-sm">
          <AlertCircle size={18} strokeWidth={2.5} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-error/70 transition-colors">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── Form ── */}
      <div className="flex-1 p-4 md:p-8 pb-12">
        <div className="max-w-[900px] mx-auto space-y-10">

          {/* Basic Info */}
          <Section title="Basic Info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Name (English)" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Edible Oils"
                  className={inputCls}
                />
              </Field>
              <Field label="Name (Odia)">
                <input
                  type="text"
                  value={form.name_or}
                  onChange={e => set('name_or', e.target.value)}
                  placeholder="ଓଡ଼ିଆ ନାମ…"
                  className={inputCls}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={translateToOdia}
              disabled={translating}
              title="Fill the Odia name & description from the English fields using AI"
              className="flex items-center gap-2 px-5 py-2.5 bg-surface-card border-2 border-primary/30 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-primary/60 disabled:opacity-60 transition-all active:scale-95 w-max"
            >
              <span className={`material-symbols-outlined text-[16px] ${translating ? 'animate-spin' : ''}`}>
                {translating ? 'progress_activity' : 'translate'}
              </span>
              {translating ? 'Translating…' : 'Translate to Odia'}
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Slug" hint="URL path — auto-generated from name">
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => set('slug', e.target.value)}
                  placeholder="edible-oils"
                  className={inputCls}
                />
              </Field>
              <Field label="Icon" hint="Material symbol name (e.g. local_dining)">
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={form.icon}
                    onChange={e => set('icon', e.target.value)}
                    placeholder="local_dining"
                    className={cn(inputCls, 'flex-1')}
                  />
                  {form.icon && (
                    <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {form.icon}
                    </span>
                  )}
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Display Order" hint="Lower number = shows first">
                <input
                  type="number"
                  value={form.display_order}
                  min={0}
                  onChange={e => set('display_order', parseInt(e.target.value, 10) || 0)}
                  className={inputCls}
                />
              </Field>
              <Field label="Parent Category" hint="Leave empty for top-level">
                <select
                  value={form.parent_id}
                  onChange={e => set('parent_id', e.target.value)}
                  className={inputCls}
                >
                  <option value="">None (top-level)</option>
                  {parentOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex items-center justify-between gap-6 p-5 bg-surface-card rounded-2xl border-2 border-table-border max-w-sm">
              <div>
                <p className="font-black text-xs text-primary uppercase tracking-widest">Active</p>
                <p className="font-bold text-[10px] text-on-surface-variant mt-1">Visible in the shop</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => set('is_active', !form.is_active)}
                className={cn(
                  'relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-colors active:scale-95',
                  form.is_active ? 'bg-primary border-primary' : 'bg-surface border-table-border',
                )}
              >
                <span className={cn(
                  'inline-block h-4 w-4 rounded-full shadow transition-transform',
                  form.is_active ? 'translate-x-6 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50',
                )} />
              </button>
            </div>
          </Section>

          {/* Category Image */}
          <Section title="Category Image">
            <p className="font-bold text-xs text-on-surface-variant -mt-3 mb-4">
              Shown in the category grid on the homepage.
            </p>
            <ImageUploadField
              url={form.image_url}
              uploading={uploadingImage}
              onUpload={f => uploadImage(f, 'image_url')}
              onClear={() => set('image_url', '')}
              placeholder="Upload category image"
            />
          </Section>

          {/* Description */}
          <Section title="Description">
            <Field label="Description (English)">
              <RichTextEditor
                content={form.description}
                onChange={v => set('description', v)}
                placeholder="Describe this category…"
              />
            </Field>
            <Field label="Description (Odia)">
              <RichTextEditor
                content={form.description_or}
                onChange={v => set('description_or', v)}
                placeholder="ଓଡ଼ିଆ ବିବରଣ…"
              />
            </Field>
            <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">
              Note: descriptions are stored locally and will persist once DB migration adds description columns.
            </p>
          </Section>

          {/* SEO */}
          <Section title="SEO">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Meta Title" hint={`${form.meta_title.length}/60`}>
                <input
                  type="text"
                  value={form.meta_title}
                  maxLength={60}
                  onChange={e => set('meta_title', e.target.value)}
                  placeholder={form.name || 'Category meta title…'}
                  className={inputCls}
                />
              </Field>
              <Field label="Meta Description" hint={`${form.meta_description.length}/160`}>
                <input
                  type="text"
                  value={form.meta_description}
                  maxLength={160}
                  onChange={e => set('meta_description', e.target.value)}
                  placeholder="Brief description for search results…"
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">
              Note: SEO fields will persist once DB migration adds meta_title/meta_description columns to categories.
            </p>
          </Section>

        </div>
      </div>

    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <h2 className="font-black text-xl text-primary tracking-tight border-b-2 border-table-border pb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
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

function ImageUploadField({
  url, uploading, onUpload, onClear, placeholder,
}: {
  url: string
  uploading: boolean
  onUpload: (f: File) => Promise<void>
  onClear: () => void
  placeholder: string
}) {
  return (
    <div className="space-y-3">
      {url ? (
        <div className="relative inline-block group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-48 h-48 object-cover rounded-xl border-2 border-table-border" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 w-8 h-8 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <label className={cn(
          'flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-table-border bg-surface-card rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.99]',
          uploading && 'opacity-50 pointer-events-none',
        )}>
          <div className="p-3 bg-surface border-2 border-table-border rounded-xl mb-3">
            <CloudUpload size={24} className="text-primary" />
          </div>
          <p className="font-bold text-xs text-primary text-center px-3">
            {uploading ? 'Uploading…' : placeholder}
          </p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}

function RichTextEditor({ content, onChange, placeholder }: {
  content: string; onChange: (html: string) => void; placeholder?: string
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[140px] p-4 focus:outline-none font-bold text-sm text-on-surface',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  return (
    <div className="border-2 border-table-border rounded-xl bg-surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b-2 border-table-border bg-surface-card">
        {[
          { cmd: () => editor?.chain().focus().toggleBold().run(), active: !!editor?.isActive('bold'), icon: <Bold size={16} /> },
          { cmd: () => editor?.chain().focus().toggleItalic().run(), active: !!editor?.isActive('italic'), icon: <Italic size={16} /> },
          { cmd: () => editor?.chain().focus().toggleBulletList().run(), active: !!editor?.isActive('bulletList'), icon: <List size={16} /> },
          { cmd: () => editor?.chain().focus().toggleOrderedList().run(), active: !!editor?.isActive('orderedList'), icon: <ListOrdered size={16} /> },
        ].map(({ cmd, active, icon }, i) => (
          <button
            key={i}
            type="button"
            onClick={cmd}
            className={cn(
              'p-1.5 rounded-lg border-2 transition-colors active:scale-95',
              active ? 'bg-primary border-primary text-white shadow-sm' : 'bg-surface border-transparent text-on-surface-variant hover:border-table-border hover:bg-surface-card',
            )}
          >
            {icon}
          </button>
        ))}
      </div>
      {!content && !editor?.getText() && (
        <p className="absolute pointer-events-none p-5 font-bold text-sm text-on-surface-variant">{placeholder}</p>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
