'use client'

import { cn } from '@/lib/utils'
import type { AdminPermissions } from '@/types/admin.types'
import { PERMISSION_LABELS } from '@/types/admin.types'

const GROUPS: { label: string; keys: (keyof AdminPermissions)[] }[] = [
  { label: 'Orders', keys: ['view_orders', 'update_order_status'] },
  { label: 'Catalogue', keys: ['manage_products', 'manage_categories', 'manage_banners', 'manage_cms', 'manage_coupons'] },
  { label: 'Operations', keys: ['manage_pincodes', 'manage_delivery_persons', 'view_abandoned_carts', 'view_unserviceable'] },
  { label: 'Team & Data', keys: ['manage_admin_profiles', 'view_analytics', 'receive_order_emails', 'export_data'] },
]

interface Props {
  permissions: AdminPermissions
  onChange: (p: AdminPermissions) => void
  disabled?: boolean
}

export default function PermissionsMatrix({ permissions, onChange, disabled }: Props) {
  const toggle = (key: keyof AdminPermissions) => {
    if (disabled) return
    onChange({ ...permissions, [key]: !permissions[key] })
  }

  return (
    <div className="border border-outline-variant/50 rounded-xl overflow-hidden bg-surface-container-lowest">
      <div className="flex items-center justify-between px-5 py-3.5 bg-surface-container-low border-b border-outline-variant/30">
        <p className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider">Permissions</p>
        {!disabled && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onChange(Object.fromEntries(Object.keys(permissions).map((k) => [k, true])) as unknown as AdminPermissions)}
              className="font-label-sm text-label-sm text-primary hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onChange(Object.fromEntries(Object.keys(permissions).map((k) => [k, false])) as unknown as AdminPermissions)}
              className="font-label-sm text-label-sm text-on-surface-variant hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="divide-y divide-outline-variant/20">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-5 py-2 font-label-sm text-label-sm text-on-surface-variant/60 uppercase tracking-widest bg-surface-container/40">
              {group.label}
            </p>
            {group.keys.map((key) => (
              <label
                key={key}
                className={cn(
                  'flex items-center justify-between px-5 py-3 transition-colors border-t border-outline-variant/20',
                  disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-surface-container-low cursor-pointer',
                )}
              >
                <span className="font-body-md text-body-md text-on-surface">{PERMISSION_LABELS[key]}</span>
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    permissions[key]
                      ? 'bg-primary border-primary'
                      : 'border-outline bg-surface-container-lowest',
                  )}
                  onClick={() => toggle(key)}
                >
                  {permissions[key] && (
                    <svg viewBox="0 0 10 8" className="w-3 h-3 stroke-on-primary fill-none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 4l3 3 5-6" />
                    </svg>
                  )}
                </div>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
