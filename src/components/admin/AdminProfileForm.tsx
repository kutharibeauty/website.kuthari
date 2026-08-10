'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import PermissionsMatrix from './PermissionsMatrix'
import type { AdminPermissions, AdminProfile } from '@/types/admin.types'
import { DEFAULT_PERMISSIONS } from '@/types/admin.types'

interface Props {
  profile?: AdminProfile
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

export default function AdminProfileForm({ profile }: Props) {
  const router = useRouter()
  const isEdit = !!profile
  const isSuperAdmin = profile?.role === 'super_admin'

  const [name, setName] = useState(profile?.name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [role, setRole] = useState<'admin' | 'delivery'>(
    profile?.role === 'super_admin' ? 'admin' : (profile?.role ?? 'admin'),
  )
  const [permissions, setPermissions] = useState<AdminPermissions>(
    profile?.permissions ?? DEFAULT_PERMISSIONS,
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSuperAdmin) return
    setSubmitting(true)
    setError(null)

    const payload = isEdit
      ? { name, email: email || null, permissions: role === 'admin' ? permissions : {} }
      : { name, phone, email: email || null, role, permissions: role === 'admin' ? permissions : {} }

    const url = isEdit ? `/api/admin-profiles/${profile.id}` : '/api/admin-profiles'
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSubmitting(false)
    if (!res.ok) {
      const d = await res.json()
      const msg = d.error ?? 'Something went wrong'
      setError(msg)
      showToast(msg, 'error')
      return
    }
    showToast(isEdit ? 'Changes saved successfully' : 'Profile created successfully')
    router.push('/admin/profiles')
    router.refresh()
  }

  async function handleDeactivate() {
    if (!profile || isSuperAdmin) return
    if (!confirm(`Deactivate ${profile.name}? They will lose access immediately.`)) return
    setSubmitting(true)
    const res = await fetch(`/api/admin-profiles/${profile.id}`, { method: 'DELETE' })
    setSubmitting(false)
    if (res.ok) {
      showToast(`${profile.name} deactivated`)
      router.push('/admin/profiles')
      router.refresh()
    }
    else { const d = await res.json(); const msg = d.error ?? 'Failed to deactivate'; setError(msg); showToast(msg, 'error') }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg font-body-md text-body-md">
          {error}
        </div>
      )}

      {/* Details */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm p-6 space-y-4">
        <h2 className="font-headline-md text-headline-md text-on-surface">Profile Details</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1.5">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required disabled={isSuperAdmin} placeholder="Full name" className={inputCls} />
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1.5">
              Phone *{isEdit && <span className="normal-case ml-1 opacity-50">(read-only)</span>}
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={isEdit} placeholder="+91 9876543210" className={inputCls} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1.5">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" disabled={isSuperAdmin} placeholder="email@example.com" className={inputCls} />
          </div>
          {!isSuperAdmin && (
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1.5">
                Role *{isEdit && <span className="normal-case ml-1 opacity-50">(read-only)</span>}
              </label>
              <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'delivery')} disabled={isEdit} className={inputCls}>
                <option value="admin">Admin</option>
                <option value="delivery">Delivery Person</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Permissions */}
      {role === 'admin' && !isSuperAdmin && (
        <PermissionsMatrix permissions={permissions} onChange={setPermissions} />
      )}

      {role === 'delivery' && (
        <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-4">
          <p className="font-body-md text-body-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] align-text-bottom mr-1">info</span>
            Delivery persons have fixed permissions: view assigned orders, update delivery status, and record payments only.
          </p>
        </div>
      )}

      {isSuperAdmin && (
        <div className="bg-secondary-container/40 border border-secondary/20 rounded-xl p-4">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Super Admin has full access to everything and cannot be restricted or deactivated.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={submitting || isSuperAdmin}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-full font-label-sm text-label-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Profile'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/profiles')}
          className="px-6 py-3 rounded-full border-[1.5px] border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider hover:bg-surface-container transition-colors"
        >
          Cancel
        </button>
        {isEdit && !isSuperAdmin && profile?.is_active && (
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={submitting}
            className={cn('ml-auto px-6 py-3 rounded-full border-[1.5px] border-error text-error font-label-sm text-label-sm uppercase tracking-wider hover:bg-error/5 transition-colors disabled:opacity-60')}
          >
            Deactivate
          </button>
        )}
      </div>
    </form>
  )
}
