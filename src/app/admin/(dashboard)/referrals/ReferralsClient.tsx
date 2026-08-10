'use client'

import { useState } from 'react'
import { Loader2, Gift, Users, Coins, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { referralBenefitText, type ReferralConfig, type DiscountType } from '@/lib/referral/shared'

const inputCls =
  'w-full px-4 py-3 rounded-xl border-2 border-table-border bg-surface-card text-sm font-bold text-on-surface focus:outline-none focus:border-primary transition-colors'
const labelCls = 'text-[11px] font-black text-on-surface-variant/70 uppercase tracking-[0.1em] block mb-1.5'

function TypeValue({
  type, value, onType, onValue,
}: {
  type: DiscountType; value: string
  onType: (t: DiscountType) => void; onValue: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Discount Type</label>
        <select value={type} onChange={e => onType(e.target.value as DiscountType)} className={inputCls}>
          <option value="flat">Flat (₹)</option>
          <option value="percentage">Percentage (%)</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>{type === 'percentage' ? 'Percent' : 'Amount (₹)'}</label>
        <input type="number" min={0} value={value} onChange={e => onValue(e.target.value)} placeholder={type === 'percentage' ? '10' : '100'} className={inputCls} />
      </div>
    </div>
  )
}

export default function ReferralsClient({
  initialConfig,
  stats,
}: {
  initialConfig: ReferralConfig
  stats: { totalReferrals: number; totalRewards: number }
}) {
  const [cfg, setCfg] = useState<ReferralConfig>(initialConfig)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ReferralConfig>(k: K, v: ReferralConfig[K]) => {
    setCfg(prev => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true); setError(null)
    try {
      const value: ReferralConfig = {
        enabled: cfg.enabled,
        referrer_type: cfg.referrer_type,
        referrer_value: Number(cfg.referrer_value) || 0,
        referee_type: cfg.referee_type,
        referee_value: Number(cfg.referee_value) || 0,
        min_order_value: cfg.min_order_value ? Number(cfg.min_order_value) : null,
        max_discount: cfg.max_discount ? Number(cfg.max_discount) : null,
      }
      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'referral_config', value }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Save failed') }
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight flex items-center gap-2">
            <Gift size={26} /> Referrals
          </h1>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">
            Refer-a-friend program — Super Admin
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60 transition-colors active:scale-95 flex items-center gap-2"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {error && (
        <p className="text-sm font-bold text-error bg-error/10 border-2 border-error/20 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border-2 border-table-border bg-surface-card p-4">
          <div className="flex items-center gap-2 text-on-surface-variant/60"><Users size={15} /><span className="text-[10px] font-black uppercase tracking-widest">Referrals</span></div>
          <p className="text-2xl font-black text-primary mt-1">{stats.totalReferrals}</p>
        </div>
        <div className="rounded-2xl border-2 border-table-border bg-surface-card p-4">
          <div className="flex items-center gap-2 text-on-surface-variant/60"><Coins size={15} /><span className="text-[10px] font-black uppercase tracking-widest">Rewards Given</span></div>
          <p className="text-2xl font-black text-primary mt-1">₹{stats.totalRewards.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="rounded-2xl border-2 border-table-border bg-surface-card p-5">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p className="font-black text-sm text-primary">Enable referral program</p>
            <p className="text-xs font-medium text-on-surface-variant/60 mt-0.5">
              Customers get a code after their first purchase. New customers can redeem a code at checkout.
            </p>
          </div>
          <input type="checkbox" checked={cfg.enabled} onChange={e => set('enabled', e.target.checked)} className="sr-only" />
          <div className={cn('w-11 h-6 rounded-full transition-colors flex-shrink-0', cfg.enabled ? 'bg-primary' : 'bg-outline-variant')}>
            <div className={cn('mt-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform', cfg.enabled ? 'translate-x-[22px]' : 'translate-x-0.5')} />
          </div>
        </label>
      </div>

      {/* Referee (taker) */}
      <div className="rounded-2xl border-2 border-table-border bg-surface-card p-5 space-y-4">
        <div>
          <p className="font-black text-sm text-primary">New customer (referral taker)</p>
          <p className="text-xs font-medium text-on-surface-variant/60 mt-0.5">Discount the new customer gets on their first order when they use a code.</p>
        </div>
        <TypeValue
          type={cfg.referee_type} value={String(cfg.referee_value)}
          onType={t => set('referee_type', t)} onValue={v => set('referee_value', Number(v) || 0)}
        />
      </div>

      {/* Referrer (giver) */}
      <div className="rounded-2xl border-2 border-table-border bg-surface-card p-5 space-y-4">
        <div>
          <p className="font-black text-sm text-primary">Existing customer (referral giver)</p>
          <p className="text-xs font-medium text-on-surface-variant/60 mt-0.5">Reward the referrer earns; it auto-applies to their next order.</p>
        </div>
        <TypeValue
          type={cfg.referrer_type} value={String(cfg.referrer_value)}
          onType={t => set('referrer_type', t)} onValue={v => set('referrer_value', Number(v) || 0)}
        />
      </div>

      {/* Limits */}
      <div className="rounded-2xl border-2 border-table-border bg-surface-card p-5 grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Min order value (₹)</label>
          <input type="number" min={0} value={cfg.min_order_value ?? ''} onChange={e => set('min_order_value', e.target.value ? Number(e.target.value) : null)} placeholder="Optional" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Max discount cap (₹)</label>
          <input type="number" min={0} value={cfg.max_discount ?? ''} onChange={e => set('max_discount', e.target.value ? Number(e.target.value) : null)} placeholder="Optional" className={inputCls} />
        </div>
      </div>

      <p className="text-center text-sm font-bold text-primary bg-primary/5 border-2 border-primary/15 rounded-xl py-3">
        Preview: {referralBenefitText(cfg)}
      </p>
    </div>
  )
}
