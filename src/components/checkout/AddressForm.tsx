'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { X, Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import PincodeChecker from './PincodeChecker'
import type { Address, AddressLabel } from '@/types/database.types'
import type { AddressFormData } from '@/lib/validations/address'

const LABELS: AddressLabel[] = ['Home', 'Office', 'Storefront', 'Other']

interface Props {
  profileId: string
  onSaved: (address: Address) => void
  onClose: () => void
  /** When provided, the form edits this address instead of creating a new one. */
  address?: Address
}

const inputCls =
  'w-full px-4 py-3 rounded-xl border-2 border-table-border bg-surface-card text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(27, 44, 61,0.06)] transition-all duration-200'
const errorCls = 'text-[11px] font-bold text-error mt-1'
const labelCls = 'text-[11px] font-black text-on-surface-variant/70 uppercase tracking-[0.1em] block mb-1.5'

export default function AddressForm({ profileId, onSaved, onClose, address }: Props) {
  const isEditing = !!address
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pincodeValue, setPincodeValue] = useState('')
  const [pincodeOk, setPincodeOk] = useState<boolean | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AddressFormData>({
    defaultValues: address
      ? {
          name: address.name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2 ?? '',
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          label: address.label ?? 'Home',
          is_default: address.is_default,
        }
      : { label: 'Home', is_default: false },
  })

  const watchedPincode = watch('pincode', address?.pincode ?? '')

  const onSubmit = async (data: AddressFormData) => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(
        isEditing ? `/api/addresses/${address.id}` : '/api/addresses',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            phone: data.phone,
            line1: data.line1,
            line2: data.line2 ?? null,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            label: data.label ?? null,
            is_default: data.is_default ?? false,
          }),
        },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to save address.')
      onSaved(json as Address)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save address. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // z-[60] sits above the mobile bottom nav (z-50) — otherwise the nav renders
  // over the sheet and the Save button can't be tapped.
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-2xl bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-table-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className="text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-sans text-lg font-black text-primary tracking-tight leading-none">{isEditing ? 'Edit Address' : 'Add New Address'}</h3>
              <p className="text-[11px] font-medium text-on-surface-variant/60 mt-1">Where should we deliver your order?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant/60 hover:text-primary transition-colors"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-6 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] overflow-y-auto"
        >
          {/* Label picker */}
          <div>
            <span className={labelCls}>Address Label</span>
            <div className="grid grid-cols-4 gap-2">
              {LABELS.map((lbl) => (
                <label key={lbl} className="cursor-pointer">
                  <input type="radio" {...register('label')} value={lbl} className="sr-only" />
                  <span
                    className={cn(
                      'flex items-center justify-center px-2 py-2.5 rounded-xl text-[13px] font-bold border-2 transition-all duration-200 active:scale-95',
                      watch('label') === lbl
                        ? 'bg-primary text-on-primary border-primary shadow-sm shadow-primary/20'
                        : 'bg-surface-card text-on-surface-variant border-table-border hover:border-primary/40 hover:text-primary',
                    )}
                  >
                    {lbl}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="addr-name" className={labelCls}>Full Name *</label>
              <input
                id="addr-name"
                {...register('name', { required: 'Required' })}
                placeholder="Ravi Kumar"
                className={inputCls}
              />
              {errors.name && <p className={errorCls}>{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="addr-phone" className={labelCls}>Mobile *</label>
              <input
                id="addr-phone"
                {...register('phone', { required: 'Required' })}
                placeholder="9876543210"
                className={inputCls}
              />
              {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
            </div>
          </div>

          {/* Line 1 */}
          <div>
            <label htmlFor="addr-line1" className={labelCls}>Address Line 1 *</label>
            <input
              id="addr-line1"
              {...register('line1', { required: 'Required' })}
              placeholder="Door/Flat no., Building, Street"
              className={inputCls}
            />
            {errors.line1 && <p className={errorCls}>{errors.line1.message}</p>}
          </div>

          {/* Line 2 */}
          <div>
            <label htmlFor="addr-line2" className={labelCls}>Address Line 2</label>
            <input
              id="addr-line2"
              {...register('line2')}
              placeholder="Landmark, Area (optional)"
              className={inputCls}
            />
          </div>

          {/* City + State + Pincode */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="addr-city" className={labelCls}>City *</label>
              <input
                id="addr-city"
                {...register('city', { required: 'Required' })}
                placeholder="Bhubaneswar"
                className={inputCls}
              />
              {errors.city && <p className={errorCls}>{errors.city.message}</p>}
            </div>
            <div>
              <label htmlFor="addr-state" className={labelCls}>State *</label>
              <input
                id="addr-state"
                {...register('state', { required: 'Required' })}
                placeholder="Odisha"
                className={inputCls}
              />
              {errors.state && <p className={errorCls}>{errors.state.message}</p>}
            </div>
            <div>
              <label htmlFor="addr-pincode" className={labelCls}>Pincode *</label>
              <input
                id="addr-pincode"
                {...register('pincode', {
                  required: 'Required',
                  pattern: { value: /^\d{6}$/, message: '6 digits' },
                  onChange: (e) => setPincodeValue(e.target.value),
                })}
                placeholder="751001"
                maxLength={6}
                className={inputCls}
              />
              {errors.pincode && <p className={errorCls}>{errors.pincode.message}</p>}
            </div>
          </div>

          {/* Pincode checker */}
          <PincodeChecker
            pincode={watchedPincode}
            onResult={(r) => setPincodeOk(r?.serviceable ?? null)}
          />

          {/* Default toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('is_default')} className="sr-only" />
            <div
              className={cn(
                'w-9 h-5 rounded-full transition-colors',
                watch('is_default') ? 'bg-primary' : 'bg-outline-variant',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                  watch('is_default') ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </div>
            <span className="font-body-md text-body-md text-on-surface-variant">
              Set as default address
            </span>
          </label>

          {/* Save error */}
          {saveError && (
            <p className="text-[13px] font-bold text-error bg-error/10 border-2 border-error/20 rounded-xl px-4 py-3">
              {saveError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 rounded-xl border-2 border-table-border text-on-surface-variant font-black text-xs uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3.5 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:hover:translate-y-0 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
