'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { createStaffClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { AdminBadges } from './AdminShell'
import type { AdminPermissions } from '@/types/admin.types'
import Logo from './Logo'
import { X, LogOut, ShieldAlert } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: string
  show?: boolean
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

interface Props {
  role: 'super_admin' | 'admin'
  onClose?: () => void
  className?: string
  badges?: AdminBadges
  /** Authoritative display name from admin_profiles (see admin layout). */
  name?: string | null
  /** Authoritative permissions from admin_profiles (see admin layout). */
  permissions?: AdminPermissions | null
}

export default function AdminSidebar({ role, onClose, className, badges, name, permissions }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user } = useSupabaseUser()

  // Role and permissions come from the server (admin layout), which has already
  // authenticated this request — NOT from a browser-side session lookup. That
  // lookup returning no user left a super_admin staring at a sidebar with only
  // "Dashboard" on it.
  //
  // super_admin short-circuits before `permissions` is consulted at all, so full
  // access never depends on that JSON carrying every key. A section added later
  // shows up for super_admin with no permissions backfill. Regular admins stay
  // restricted to the keys their own row actually grants.
  const isSuperAdmin = role === 'super_admin'
  const can = (key: keyof AdminPermissions) => isSuperAdmin || !!permissions?.[key]

  // Prefer the live admin_profiles name; fall back to the Auth metadata copy.
  const displayName = name || (user?.user_metadata as { name?: string })?.name || 'Admin'

  const signOut = async () => {
    // Sign out only the STAFF session (its own cookie), scope 'local' so the
    // customer/store session is untouched.
    await createStaffClient().auth.signOut({ scope: 'local' })
  }

  const nav: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { href: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { href: '/admin/orders',     label: 'Orders',          icon: 'receipt_long',          show: can('view_orders'),          badge: badges?.orders },
        { href: '/admin/products',   label: 'Products',        icon: 'inventory_2',           show: can('manage_products') },
        { href: '/admin/categories', label: 'Categories',      icon: 'category',              show: can('manage_categories') },
        { href: '/admin/coupons',    label: 'Coupons',         icon: 'local_offer',           show: can('manage_coupons') },
        { href: '/admin/referrals',  label: 'Referrals',       icon: 'redeem',                show: isSuperAdmin || can('manage_coupons') },
      ],
    },
    {
      label: 'Content',
      items: [
        { href: '/admin/banners', label: 'Banners & CMS', icon: 'photo_library', show: can('manage_banners') || can('manage_cms') },
      ],
    },
    {
      label: 'Logistics',
      items: [
        { href: '/admin/pincodes',          label: 'Serviceable PINs',icon: 'pin_drop',             show: can('manage_pincodes') },
        { href: '/admin/unserviceable',     label: 'Unserviceable',   icon: 'location_off',         show: can('view_unserviceable'),   badge: badges?.unserviceable },
        { href: '/admin/abandoned-carts',   label: 'Abandoned Carts', icon: 'remove_shopping_cart', show: can('view_abandoned_carts') },
        { href: '/admin/delivery/persons',  label: 'Delivery Team',   icon: 'delivery_dining',      show: can('manage_delivery_persons') },
        { href: '/admin/delivery-vehicles', label: 'Delivery Vehicles',icon: 'local_shipping',      show: can('manage_delivery_persons') },
      ],
    },
    {
      label: 'Team',
      items: [
        { href: '/admin/profiles',  label: 'Admin Profiles', icon: 'manage_accounts', show: isSuperAdmin || can('manage_admin_profiles') },
        { href: '/admin/analytics', label: 'Analytics',      icon: 'bar_chart',       show: can('view_analytics') },
        // Settings live in cms_content and /api/cms already accepts admin or
        // super_admin — gate the link on the same permission so it isn't hidden
        // from admins who can actually use it.
        { href: '/admin/settings',  label: 'Settings',       icon: 'settings',        show: isSuperAdmin || can('manage_cms') },
      ],
    },
  ]

  const isActive = (href: string) =>
    href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href)

  const handleLogout = async () => {
    // Admin and store are now separate sessions — this ends only the admin one.
    await signOut()
    router.push('/admin/login')
  }

  return (
    <aside className={cn(
      'flex flex-col w-72 h-screen bg-primary border-r-2 border-primary relative overflow-hidden',
      className,
    )}>
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* ── Brand ── */}
      <div className="px-6 py-6 flex items-center gap-3 flex-shrink-0 relative z-10 border-b-2 border-white/10">
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 p-1.5">
          <Logo className="h-full w-auto" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Admin Panel</p>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto lg:hidden p-1.5 rounded-xl text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide relative z-10">
        {nav.map((group) => {
          const visible = group.items.filter((i) => i.show !== false)
          if (!visible.length) return null
          return (
            <div key={group.label} className="mb-6">
              <p className="px-4 py-1.5 text-[10px] font-black text-white/35 uppercase tracking-[0.2em]">
                {group.label}
              </p>
              <div className="space-y-1">
                {visible.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-bold',
                        active
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-white/60 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-[20px] flex-shrink-0"
                        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {!!item.badge && (
                        <span className="ml-auto min-w-[24px] h-6 flex items-center justify-center rounded-lg bg-error text-white font-black text-[10px] px-1.5 flex-shrink-0 border-2 border-primary/20">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* ── User footer ── */}
      <div className="px-4 py-4 border-t-2 border-white/10 flex-shrink-0 space-y-2 relative z-10 bg-primary">
        {/* User info */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center flex-shrink-0">
            <span className="font-black text-lg text-white">
              {displayName[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white font-black truncate leading-tight mb-0.5">
              {displayName}
            </p>
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-1">
              <ShieldAlert size={10} />
              {role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-white/10 text-white hover:bg-error/20 hover:border-error/50 hover:text-error-container transition-colors text-xs font-black uppercase tracking-widest active:scale-95"
        >
          <LogOut size={16} strokeWidth={2.5} />
          Logout
        </button>
      </div>
    </aside>
  )
}
