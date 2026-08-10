'use client'

import { useState, useCallback } from 'react'
import { Loader2, AlertTriangle, Check, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import { formatMinute, parseTimeToMinutes } from '@/lib/store-hours'

const inputCls = 'w-full px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary placeholder:font-medium placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors'

/** "04:00" → "4:00 AM" for the settings preview; leaves malformed input as-is. */
function fmtTime(hhmm: string): string {
  const m = parseTimeToMinutes(hhmm)
  return m == null ? hhmm : formatMinute(m)
}

type Settings = {
  store_name: string
  store_tagline: string
  store_tagline_or: string
  min_order_value: string
  bulk_order_minimum: string
  order_hours_enabled: boolean
  order_open_time: string
  order_close_time: string
  free_delivery_min: string
  flat_delivery_fee: string
  low_stock_threshold: string
  admin_notification_email: string
  otp_expiry_minutes: string
  razorpay_enabled: boolean
  delivery_enabled: boolean
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-card rounded-2xl border-2 border-table-border p-6 space-y-6">
      <div className="border-b-2 border-table-border pb-4">
        <h2 className="font-black text-xl text-primary">{title}.</h2>
        {sub && <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">{sub}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="font-black text-[10px] text-primary uppercase tracking-widest flex items-center">
        {label}
        {required && <span className="text-error ml-1">*</span>}
        {hint && <span className="font-bold text-[10px] text-on-surface-variant ml-3 normal-case tracking-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub: string
}) {
  return (
    <div className="flex items-center justify-between gap-6 p-5 bg-surface rounded-2xl border-2 border-table-border">
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
        <span className={cn(
          'inline-block h-4 w-4 rounded-full shadow transition-transform',
          checked ? 'translate-x-6 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50',
        )} />
      </button>
    </div>
  )
}

export default function SettingsClient({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  async function handleSave() {
    setError(null)

    // Validate
    if (!settings.store_name.trim()) { setError('Store name is required'); return }
    const minOrder = parseFloat(settings.min_order_value)
    if (settings.min_order_value && isNaN(minOrder)) { setError('Min order value must be a number'); return }
    const otp = parseInt(settings.otp_expiry_minutes, 10)
    if (settings.otp_expiry_minutes && (isNaN(otp) || otp < 1 || otp > 60)) {
      setError('OTP expiry must be between 1 and 60 minutes'); return
    }
    if (settings.order_hours_enabled) {
      if (parseTimeToMinutes(settings.order_open_time) == null || parseTimeToMinutes(settings.order_close_time) == null) {
        setError('Enter valid order open and close times'); return
      }
      if (settings.order_open_time === settings.order_close_time) {
        setError('Order open and close times cannot be the same'); return
      }
    }

    setSaving(true)

    const payload = {
      store_name: settings.store_name.trim(),
      store_tagline: settings.store_tagline.trim(),
      store_tagline_or: settings.store_tagline_or.trim(),
      min_order_value: settings.min_order_value ? parseFloat(settings.min_order_value) : 0,
      bulk_order_minimum: settings.bulk_order_minimum ? parseFloat(settings.bulk_order_minimum) : 0,
      order_hours_enabled: settings.order_hours_enabled,
      order_open_time: settings.order_open_time || '04:00',
      order_close_time: settings.order_close_time || '20:30',
      free_delivery_min: settings.free_delivery_min ? parseFloat(settings.free_delivery_min) : 1000,
      flat_delivery_fee: settings.flat_delivery_fee ? parseFloat(settings.flat_delivery_fee) : 50,
      low_stock_threshold: settings.low_stock_threshold ? parseInt(settings.low_stock_threshold, 10) : 10,
      admin_notification_email: settings.admin_notification_email.trim(),
      otp_expiry_minutes: settings.otp_expiry_minutes ? parseInt(settings.otp_expiry_minutes, 10) : 10,
      razorpay_enabled: settings.razorpay_enabled,
      delivery_enabled: settings.delivery_enabled,
    }

    const res = await fetch('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'settings', value: payload }),
    })

    if (res.ok) {
      setSaved(true)
      showToast('Changes saved successfully', 'success')
      setTimeout(() => setSaved(false), 3000)
    } else {
      const d = await res.json() as { error?: string }
      const msg = d.error ?? 'Failed to save settings'
      setError(msg)
      showToast(msg, 'error')
    }

    setSaving(false)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full pb-12 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">
            Settings.
          </h1>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">
            Store configuration
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-opacity active:scale-95 shadow-sm"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Saving…' : saved ? <><Check size={16} strokeWidth={2.5} /> Saved</> : 'Save Settings'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 px-5 py-4 bg-error/10 border-2 border-error/20 rounded-2xl text-error">
          <AlertCircle size={20} strokeWidth={2.5} className="flex-shrink-0" />
          <p className="font-bold text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-error/10 rounded-lg transition-colors">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── Store Info ── */}
      <Section title="Store Info" sub="Displayed across the site and synced with CMS footer">
        <Field label="Store Name" required>
          <input
            type="text"
            value={settings.store_name}
            onChange={e => set('store_name', e.target.value)}
            placeholder="Kuthari Beauty Store"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Tagline (English)">
            <input
              type="text"
              value={settings.store_tagline}
              onChange={e => set('store_tagline', e.target.value)}
              placeholder="Your trusted wholesale beauty partner"
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* ── Order Settings ── */}
      <Section title="Order Settings" sub="Control minimum thresholds for checkout">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Minimum Order Value" hint="0 = no minimum">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-black text-sm">₹</span>
              <input
                type="number"
                value={settings.min_order_value}
                min={0}
                step={1}
                onChange={e => set('min_order_value', e.target.value)}
                placeholder="500"
                className={cn(inputCls, 'pl-9 font-mono')}
              />
            </div>
          </Field>
          <Field label="Bulk Order Minimum" hint="Qualifies as bulk order">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-black text-sm">₹</span>
              <input
                type="number"
                value={settings.bulk_order_minimum}
                min={0}
                step={1}
                onChange={e => set('bulk_order_minimum', e.target.value)}
                placeholder="5000"
                className={cn(inputCls, 'pl-9 font-mono')}
              />
            </div>
          </Field>
        </div>

        {/* Preview */}
        {(settings.min_order_value || settings.bulk_order_minimum) && (
          <div className="flex flex-col gap-3 pt-4 border-t-2 border-table-border">
            {settings.min_order_value && parseFloat(settings.min_order_value) > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <Info size={16} strokeWidth={2.5} className="text-blue-600 flex-shrink-0" />
                <p className="font-bold text-xs text-blue-800">
                  Customers must spend at least <strong className="font-black tracking-widest text-blue-900">₹{settings.min_order_value}</strong> to checkout
                </p>
              </div>
            )}
            {settings.bulk_order_minimum && parseFloat(settings.bulk_order_minimum) > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl">
                <Info size={16} strokeWidth={2.5} className="text-purple-600 flex-shrink-0" />
                <p className="font-bold text-xs text-purple-800">
                  Orders above <strong className="font-black tracking-widest text-purple-900">₹{settings.bulk_order_minimum}</strong> are flagged as bulk
                </p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Order Timings ── */}
      <Section title="Order Timings" sub="When customers are allowed to place orders (IST)">
        <Toggle
          checked={settings.order_hours_enabled}
          onChange={v => set('order_hours_enabled', v)}
          label="Restrict Order Hours"
          sub="When on, customers can browse the site anytime but can only place orders inside the window below. Outside it, checkout is disabled with a message."
        />
        {settings.order_hours_enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Orders Open At" hint="Store opens (IST)">
              <input
                type="time"
                value={settings.order_open_time}
                onChange={e => set('order_open_time', e.target.value)}
                className={cn(inputCls, 'font-mono')}
              />
            </Field>
            <Field label="Orders Close At" hint="Store closes (IST)">
              <input
                type="time"
                value={settings.order_close_time}
                onChange={e => set('order_close_time', e.target.value)}
                className={cn(inputCls, 'font-mono')}
              />
            </Field>
          </div>
        )}
        {settings.order_hours_enabled ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <Info size={16} strokeWidth={2.5} className="text-blue-600 flex-shrink-0" />
            <p className="font-bold text-xs text-blue-800">
              Orders can be placed only between{' '}
              <strong className="font-black text-blue-900">{fmtTime(settings.order_open_time)}</strong> and{' '}
              <strong className="font-black text-blue-900">{fmtTime(settings.order_close_time)}</strong> (IST). Outside these hours customers can still browse but checkout is disabled.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <Info size={16} strokeWidth={2.5} className="text-amber-600 flex-shrink-0" />
            <p className="font-bold text-xs text-amber-900">
              Order-hour restriction is <b>off</b> — customers can place orders at any time.
            </p>
          </div>
        )}
      </Section>

      {/* ── Delivery ── */}
      <Section title="Delivery" sub="Free-delivery threshold and the flat fee below it">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Free Delivery Above" hint="Free at/above this subtotal">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-black text-sm">₹</span>
              <input
                type="number"
                value={settings.free_delivery_min}
                min={0}
                step={1}
                onChange={e => set('free_delivery_min', e.target.value)}
                placeholder="1000"
                className={cn(inputCls, 'pl-9 font-mono')}
              />
            </div>
          </Field>
          <Field label="Flat Delivery Fee" hint="Charged below the threshold">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-black text-sm">₹</span>
              <input
                type="number"
                value={settings.flat_delivery_fee}
                min={0}
                step={1}
                onChange={e => set('flat_delivery_fee', e.target.value)}
                placeholder="50"
                className={cn(inputCls, 'pl-9 font-mono')}
              />
            </div>
          </Field>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <Info size={16} strokeWidth={2.5} className="text-blue-600 flex-shrink-0" />
          <p className="font-bold text-xs text-blue-800">
            Orders under <strong className="font-black text-blue-900">₹{settings.free_delivery_min || '1000'}</strong> pay{' '}
            <strong className="font-black text-blue-900">₹{settings.flat_delivery_fee || '50'}</strong> delivery; at or above, it's free. A per-product delivery charge (set on a product) still overrides this.
          </p>
        </div>
      </Section>

      {/* ── Inventory ── */}
      <Section title="Inventory" sub="Controls when low-stock alerts appear on the admin dashboard">
        <Field label="Low Stock Alert Threshold" hint="Alert on ≤ this value">
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={settings.low_stock_threshold}
              min={1}
              max={999}
              onChange={e => set('low_stock_threshold', e.target.value)}
              placeholder="10"
              className={cn(inputCls, 'w-32 font-mono')}
            />
            <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest">
              units remaining
            </p>
          </div>
        </Field>
      </Section>

      {/* ── Notifications ── */}
      <Section title="Notifications" sub="Where admin order alerts are sent — separate from your login phone number">
        <Field label="Admin Notification Email">
          <input
            type="email"
            value={settings.admin_notification_email}
            onChange={e => set('admin_notification_email', e.target.value)}
            placeholder="smortika@gmail.com"
            className={inputCls}
          />
        </Field>
        <p className="font-bold text-[10px] text-on-surface-variant">
          New order notifications and low stock alerts are sent here.
        </p>
      </Section>

      {/* ── OTP ── */}
      <Section title="OTP Settings" sub="Controls delivery verification OTP behaviour">
        <Field label="OTP Expiry" hint="1–60 minutes">
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={settings.otp_expiry_minutes}
              min={1}
              max={60}
              onChange={e => set('otp_expiry_minutes', e.target.value)}
              placeholder="10"
              className={cn(inputCls, 'w-32 font-mono')}
            />
            <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest">minutes</p>
          </div>
        </Field>
      </Section>

      {/* ── Payments ── */}
      <Section title="Payments" sub="Configure payment gateway availability at checkout">
        <Toggle
          checked={settings.razorpay_enabled}
          onChange={v => set('razorpay_enabled', v)}
          label="Razorpay Online Payments"
          sub="Enable UPI / card / net banking at checkout"
        />
        {settings.razorpay_enabled && (
          <div className="flex items-start gap-3 px-5 py-4 bg-amber-50 border-2 border-amber-200 rounded-xl mt-4">
            <AlertTriangle size={20} strokeWidth={2.5} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="font-bold text-xs text-amber-900 leading-relaxed">
              Ensure <code className="bg-amber-100 border-2 border-amber-200 px-1.5 py-0.5 rounded-lg text-[10px] mx-1">RAZORPAY_KEY_ID</code> and <code className="bg-amber-100 border-2 border-amber-200 px-1.5 py-0.5 rounded-lg text-[10px] mx-1">RAZORPAY_KEY_SECRET</code> are set in your environment variables before enabling.
            </p>
          </div>
        )}
        <p className="font-bold text-[10px] text-error mt-4">
          There is no Cash on Delivery option — customers cannot place any order until this is switched on and correctly configured.
        </p>
      </Section>

      {/* ── Delivery panel ── */}
      <Section title="Delivery Panel" sub="Turn the delivery-person portal on or off">
        <Toggle
          checked={settings.delivery_enabled}
          onChange={v => set('delivery_enabled', v)}
          label="Delivery Person Portal"
          sub="When off, delivery staff can't log in or use the /delivery panel. No data or code is removed — flip this on anytime to re-enable it."
        />
        {!settings.delivery_enabled && (
          <div className="flex items-start gap-3 px-5 py-4 bg-amber-50 border-2 border-amber-200 rounded-xl mt-4">
            <Info size={20} strokeWidth={2.5} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="font-bold text-xs text-amber-900 leading-relaxed">
              The delivery panel is currently <b>disabled</b>. Delivery persons cannot access it. Everything is preserved and can be re-enabled here whenever you need it.
            </p>
          </div>
        )}
      </Section>

      {/* ── Bottom save ── */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-opacity active:scale-95 shadow-sm w-full md:w-auto justify-center"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Saving…' : saved ? <><Check size={16} strokeWidth={2.5} /> All Settings Saved</> : 'Save All Settings'}
        </button>
      </div>

    </div>
  )
}
