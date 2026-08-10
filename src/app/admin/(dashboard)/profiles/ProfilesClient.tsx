'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { AdminProfile, AdminPermissions } from '@/types/admin.types'
import { Users, UserCog, Bike, Plus, Phone, Mail, CheckCircle, Clock, Edit3, Lock } from 'lucide-react'

const ROLE_STYLES: Record<AdminProfile['role'], { chip: string; label: string }> = {
  super_admin: { chip: 'bg-primary text-white border-primary',                           label: 'Super Admin' },
  admin:       { chip: 'bg-blue-50 text-blue-700 border-blue-200',   label: 'Admin' },
  delivery:    { chip: 'bg-surface text-on-surface-variant border-table-border',    label: 'Delivery' },
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
]

function permissionCount(p: AdminPermissions | null | undefined): number {
  if (!p || typeof p !== 'object') return 0
  return Object.values(p).filter(Boolean).length
}

export default function ProfilesClient({ initialProfiles }: { initialProfiles: AdminProfile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [toggling, setToggling] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)

  async function toggleActive(id: string, current: boolean) {
    setToggling(id)
    const res = await fetch(`/api/admin-profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p))
      showToast('Changes saved successfully', 'success')
    } else {
      showToast('Failed to save changes', 'error')
    }
    setToggling(null)
  }

  const activeCount   = profiles.filter(p => p.is_active).length
  const adminCount    = profiles.filter(p => p.role === 'admin').length
  const deliveryCount = profiles.filter(p => p.role === 'delivery').length

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">
            Admin Profiles.
          </h1>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">
            Manage team members and their permissions
          </p>
        </div>
        <Link
          href="/admin/profiles/new"
          className="flex items-center justify-center gap-1.5 px-5 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Profile
        </Link>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total',    value: profiles.length,   icon: <Users size={24} />,          color: 'text-primary border-primary bg-primary/5' },
          { label: 'Admins',   value: adminCount,         icon: <UserCog size={24} />, color: 'text-blue-600 border-blue-600 bg-blue-50' },
          { label: 'Delivery', value: deliveryCount,      icon: <Bike size={24} />, color: 'text-purple-600 border-purple-600 bg-purple-50' },
        ].map((card, i) => (
          <div key={card.label} className={cn("rounded-2xl border-2 p-5", card.color)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-black text-4xl leading-none">{card.value}</p>
                <p className="font-black text-[10px] uppercase tracking-widest mt-2">{card.label}</p>
              </div>
              <div className="opacity-50">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Profile list ── */}
      {profiles.length === 0 ? (
        <div className="py-24 text-center bg-surface-card rounded-2xl border-2 border-table-border">
          <div className="w-16 h-16 mx-auto bg-surface border-2 border-table-border rounded-2xl flex items-center justify-center mb-4">
            <Users size={24} className="text-on-surface-variant/40" />
          </div>
          <p className="font-black text-sm text-on-surface-variant uppercase tracking-widest mb-6">No profiles yet.</p>
          <Link
            href="/admin/profiles/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add first profile
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile, i) => {
            const roleInfo  = ROLE_STYLES[profile.role]
            const avatarCls = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const permCount = profile.role === 'admin' ? permissionCount(profile.permissions) : null
            const totalPerms = 15

            return (
              <div
                key={profile.id}
                className={cn(
                  'bg-surface-card rounded-2xl border-2 border-table-border p-6 transition-opacity',
                  !profile.is_active && 'opacity-60 grayscale-[0.5]',
                )}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-6">

                  {/* Avatar */}
                  <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-2xl border-2 border-table-border', avatarCls)}>
                    {profile.name[0]?.toUpperCase() ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <p className="font-black text-xl text-primary">{profile.name}</p>
                      <span className={cn('px-3 py-1 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest', roleInfo.chip)}>
                        {roleInfo.label}
                      </span>
                      {!profile.is_active && (
                        <span className="px-3 py-1 rounded-lg border-2 border-error text-error bg-error/10 font-black text-[10px] uppercase tracking-widest">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <p className="font-bold text-sm text-on-surface-variant flex items-center gap-1.5">
                        <Phone size={14} className="text-primary" />
                        {profile.phone}
                      </p>
                      {profile.email && (
                        <p className="font-bold text-sm text-on-surface-variant flex items-center gap-1.5">
                          <Mail size={14} className="text-primary" />
                          {profile.email}
                        </p>
                      )}
                    </div>

                    {/* Permission bar (admin only) */}
                    {permCount !== null && (
                      <div className="mt-4 flex items-center gap-3 max-w-sm">
                        <div className="flex-1 h-2 border-2 border-table-border bg-surface rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(permCount / totalPerms) * 100}%` }}
                          />
                        </div>
                        <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest">
                          {permCount}/{totalPerms} permissions
                        </p>
                      </div>
                    )}

                    {profile.role === 'delivery' && (
                      <p className="font-black text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">
                        Fixed permissions: view + update assigned orders only
                      </p>
                    )}
                  </div>

                  {/* Right side actions */}
                  <div className="flex flex-col items-start md:items-end gap-4 flex-shrink-0 mt-4 md:mt-0">

                    {/* Account link status */}
                    <div className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest',
                      profile.user_id
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200',
                    )}>
                      {profile.user_id ? <CheckCircle size={14} strokeWidth={3} /> : <Clock size={14} strokeWidth={3} />}
                      {profile.user_id ? 'Linked' : 'Pending'}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Active toggle (not for super_admin) */}
                      {profile.role !== 'super_admin' && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={profile.is_active}
                          disabled={toggling === profile.id}
                          onClick={() => toggleActive(profile.id, profile.is_active)}
                          title={profile.is_active ? 'Deactivate' : 'Activate'}
                          className={cn(
                            'relative inline-flex h-7 w-12 items-center rounded-full border-2 transition-colors disabled:opacity-50 active:scale-95',
                            profile.is_active ? 'bg-primary border-primary' : 'bg-surface border-table-border',
                          )}
                        >
                          <span className={cn(
                            'inline-block h-4 w-4 rounded-full shadow transition-transform',
                            profile.is_active ? 'translate-x-6 bg-white' : 'translate-x-1.5 bg-on-surface-variant/50',
                          )} />
                        </button>
                      )}

                      {/* Edit link */}
                      {profile.role !== 'super_admin' ? (
                        <Link
                          href={`/admin/profiles/${profile.id}`}
                          className="p-2.5 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all active:scale-95"
                          title="Edit profile"
                        >
                          <Edit3 size={16} strokeWidth={2.5} />
                        </Link>
                      ) : (
                        <div className="p-2.5 rounded-xl border-2 border-transparent bg-transparent text-on-surface-variant/30" title="Super Admin is protected">
                          <Lock size={16} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Permissions grid (admin only, expanded) */}
                {profile.role === 'admin' && profile.permissions && (
                  <div className="mt-6 pt-5 border-t-2 border-table-border">
                    <p className="font-black text-xs text-primary uppercase tracking-widest mb-3">Permissions</p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(profile.permissions) as [keyof AdminPermissions, boolean][])
                        .filter(([, v]) => v)
                        .map(([key]) => (
                          <span
                            key={key}
                            className="px-3 py-1.5 bg-surface border-2 border-table-border text-on-surface-variant rounded-lg font-black text-[10px] uppercase tracking-widest"
                          >
                            {key.replace(/_/g, ' ')}
                          </span>
                        ))
                      }
                      {Object.values(profile.permissions).every(v => !v) && (
                        <span className="font-bold text-sm text-error/60 italic">No permissions granted</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
