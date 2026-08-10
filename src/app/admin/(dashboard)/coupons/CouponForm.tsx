'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { Coupon } from '@/types/database.types'
import { ArrowLeft, Loader2, AlertCircle, X, Percent, IndianRupee, Info } from 'lucide-react'

const inputCls = 'w-full px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary placeholder:font-medium placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors'

function toDateInput(iso: string | null) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

type FormState = {
  code: string
  description: string
  description_or: string
  marquee_message: string
  marquee_message_or: string
  discount_type: 'percentage' | 'flat'
  discount_value: string
  min_order_value: string
  max_discount: string
  valid_from: string
  valid_until: string
  max_uses: string
  max_uses_per_customer: string
  is_active: boolean
}

export default function CouponForm({ coupon }: { coupon?: Coupon }) {
  const router = useRouter()
  const isEdit = !!coupon

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)
  const [translating, setTranslating] = useState(false)

  async function translateToOdia() {
    if (!form.description.trim()) { setError('Enter the English description first'); return }
    setTranslating(true)
    setError(null)
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { description: form.description.trim() } }),
    })
    if (res.ok) {
      const { translations } = await res.json() as { translations: Record<string, string> }
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
    code: coupon?.code ?? '',
    description: coupon?.description ?? '',
    description_or: coupon?.description_or ?? '',
    marquee_message: coupon?.marquee_message ?? '',
    marquee_message_or: coupon?.marquee_message_or ?? '',
    discount_type: coupon?.discount_type ?? 'percentage',
    discount_value: coupon?.discount_value?.toString() ?? '',
    min_order_value: coupon?.min_order_value?.toString() ?? '',
    max_discount: coupon?.max_discount?.toString() ?? '',
    valid_from: toDateInput(coupon?.valid_from ?? null),
    valid_until: toDateInput(coupon?.valid_until ?? null),
    max_uses: coupon?.max_uses?.toString() ?? '',
    max_uses_per_customer: coupon?.max_uses_per_customer?.toString() ?? '',
    is_active: coupon?.is_active ?? true,
  })

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])


  // Live discount preview
  const previewAmount = 500 // demo order amount
  function previewDiscount() {
    if (!form.discount_value) return null
    const val = parseFloat(form.discount_value)
    const minOrder = form.min_order_value ? parseFloat(form.min_order_value) : 0
    if (minOrder > previewAmount) return `Requires ₹${minOrder} min order`
    if (form.discount_type === 'percentage') {
      let disc = (previewAmount * val) / 100
      if (form.max_discount) disc = Math.min(disc, parseFloat(form.max_discount))
      return `-₹${disc.toFixed(2)} on ₹${previewAmount} order`
    }
    return `-₹${val.toFixed(2)} on ₹${previewAmount} order`
  }

  async function handleSave() {
    setError(null)
    if (!form.code.trim()) { setError('Coupon code is required'); return }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      setError('Discount value must be greater than 0'); return
    }
    if (form.discount_type === 'percentage' && parseFloat(form.discount_value) > 100) {
      setError('Percentage cannot exceed 100'); return
    }

    setSaving(true)

    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description.trim() || null,
      description_or: form.description_or.trim() || null,
      marquee_message: form.marquee_message.trim() || null,
      marquee_message_or: form.marquee_message_or.trim() || null,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : null,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
      max_uses_per_customer: form.max_uses_per_customer ? parseInt(form.max_uses_per_customer, 10) : null,
      is_active: form.is_active,
    }

    const url = isEdit ? `/api/coupons/${coupon.id}` : '/api/coupons'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      if (!isEdit) {
        showToast('Coupon created successfully')
        router.push('/admin/coupons')
      } else {
        showToast('Changes saved successfully')
      }
    } else {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Failed to save coupon')
    }

    setSaving(false)
  }

  const preview = previewDiscount()

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Header ── */}
      <div className="sticky top-16 z-30 bg-surface border-b-2 border-table-border px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/coupons"
            className="p-2.5 rounded-xl border-2 border-table-border bg-surface-card hover:bg-surface-container-low transition-colors text-primary active:scale-95"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight capitalize">
              {isEdit ? `Edit: ${coupon.code}` : 'New Coupon.'}
            </h1>
            {isEdit && (
              <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
                Used {coupon.uses_count} time{coupon.uses_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/coupons"
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
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Coupon'}
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

          {/* Coupon code */}
          <Section title="Coupon Code">
            <Field label="Code" required hint="Auto-uppercased">
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={form.code}
                  onChange={e => set('code', e.target.value.toUpperCase())}
                  placeholder="SUMMER20"
                  className={cn(inputCls, 'flex-1 font-mono tracking-[0.2em] text-lg uppercase')}
                />
                <button
                  type="button"
                  onClick={() => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
                    set('code', code)
                  }}
                  className="px-5 py-3 bg-surface-card border-2 border-table-border text-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-primary/40 transition-colors whitespace-nowrap active:scale-95"
                >
                  Generate
                </button>
              </div>
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Description (English)">
                <input
                  type="text"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="20% off on all oils"
                  className={inputCls}
                />
              </Field>
              <Field label="Description (Odia)">
                <input
                  type="text"
                  value={form.description_or}
                  onChange={e => set('description_or', e.target.value)}
                  placeholder="ଓଡ଼ିଆ ବିବରଣ…"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                label="Ticker Message (English)"
                hint="Optional. Shown in the scrolling coupon bar on the homepage instead of the automatic “20% OFF · description”. The code itself is always shown."
              >
                <input
                  type="text"
                  value={form.marquee_message}
                  onChange={e => set('marquee_message', e.target.value)}
                  placeholder="Ends Sunday — first order only"
                  className={inputCls}
                />
              </Field>
              <Field label="Ticker Message (Odia)">
                <input
                  type="text"
                  value={form.marquee_message_or}
                  onChange={e => set('marquee_message_or', e.target.value)}
                  placeholder="ଓଡ଼ିଆ ବାର୍ତ୍ତା…"
                  className={inputCls}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={translateToOdia}
              disabled={translating}
              title="Fill the Odia description from the English one using AI"
              className="flex items-center gap-2 px-5 py-2.5 bg-surface-card border-2 border-primary/30 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-primary/60 disabled:opacity-60 transition-all active:scale-95 w-max"
            >
              <span className={`material-symbols-outlined text-[16px] ${translating ? 'animate-spin' : ''}`}>
                {translating ? 'progress_activity' : 'translate'}
              </span>
              {translating ? 'Translating…' : 'Translate to Odia'}
            </button>
          </Section>

          {/* Discount */}
          <Section title="Discount">
            <Field label="Discount Type" required>
              <div className="flex gap-4">
                {(['percentage', 'flat'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('discount_type', type)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest',
                      form.discount_type === type
                        ? 'bg-primary border-primary text-white shadow-sm'
                        : 'bg-surface-card border-table-border text-on-surface-variant hover:border-primary/40 hover:text-primary',
                    )}
                  >
                    {type === 'percentage' ? <Percent size={16} strokeWidth={2.5} /> : <IndianRupee size={16} strokeWidth={2.5} />}
                    {type === 'percentage' ? 'Percentage' : 'Flat Amount'}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                label={form.discount_type === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'}
                required
              >
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-primary">
                    {form.discount_type === 'percentage' ? '%' : '₹'}
                  </span>
                  <input
                    type="number"
                    value={form.discount_value}
                    min={0}
                    max={form.discount_type === 'percentage' ? 100 : undefined}
                    step="0.01"
                    onChange={e => set('discount_value', e.target.value)}
                    placeholder="20"
                    className={cn(inputCls, 'pl-9')}
                  />
                </div>
              </Field>

              {form.discount_type === 'percentage' && (
                <Field label="Max Discount Cap (₹)" hint="Optional">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-primary">₹</span>
                    <input
                      type="number"
                      value={form.max_discount}
                      min={0}
                      step="0.01"
                      onChange={e => set('max_discount', e.target.value)}
                      placeholder="100"
                      className={cn(inputCls, 'pl-9')}
                    />
                  </div>
                </Field>
              )}

              <Field label="Min Order Amount (₹)" hint="Optional">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-primary">₹</span>
                  <input
                    type="number"
                    value={form.min_order_value}
                    min={0}
                    step="0.01"
                    onChange={e => set('min_order_value', e.target.value)}
                    placeholder="500"
                    className={cn(inputCls, 'pl-9')}
                  />
                </div>
              </Field>
            </div>

            {/* Live discount preview */}
            {preview && (
              <div className="flex items-center gap-3 px-5 py-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                <Info size={20} className="text-primary" />
                <p className="font-bold text-sm text-primary">
                  Preview: <strong className="font-black ml-1">{preview}</strong>
                </p>
              </div>
            )}
          </Section>

          {/* Validity */}
          <Section title="Validity">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Valid From" hint="Optional">
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={e => set('valid_from', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Valid Until" hint="Optional">
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={e => set('valid_until', e.target.value)}
                  min={form.valid_from || undefined}
                  className={inputCls}
                />
              </Field>
              <Field label="Usage Limit" hint="Total uses allowed — leave blank for unlimited">
                <input
                  type="number"
                  value={form.max_uses}
                  min={1}
                  onChange={e => set('max_uses', e.target.value)}
                  placeholder="Unlimited"
                  className={inputCls}
                />
              </Field>
              <Field label="Uses Per Customer" hint="How many times ONE customer may use it — blank for unlimited">
                <input
                  type="number"
                  value={form.max_uses_per_customer}
                  min={1}
                  onChange={e => set('max_uses_per_customer', e.target.value)}
                  placeholder="Unlimited"
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* Status */}
          <Section title="Status">
            <div className="flex items-center justify-between gap-6 p-5 bg-surface-card rounded-2xl border-2 border-table-border max-w-sm">
              <div>
                <p className="font-black text-xs text-primary uppercase tracking-widest">Active</p>
                <p className="font-bold text-[10px] text-on-surface-variant mt-1">
                  Coupon can be applied at checkout
                </p>
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

        </div>
      </div>

    </div>
  )
}

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
