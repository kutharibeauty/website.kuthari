'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import AdminSidebar from './AdminSidebar'
import type { AdminPermissions } from '@/types/admin.types'
import Logo from './Logo'
import { Menu } from 'lucide-react'
import NotificationBell, { type AdminNotification } from '@/components/admin/NotificationBell'

export interface AdminBadges {
  orders: number
  unserviceable: number
}

interface Props {
  role: 'super_admin' | 'admin'
  children: React.ReactNode
  badges?: AdminBadges
  name?: string | null
  /** Server-resolved admin_profiles.permissions; ignored for super_admin. */
  permissions?: AdminPermissions | null
  /** Header notification-bell items (new orders + unserviceable attempts). */
  notifications?: AdminNotification[]
}

const BOTTOM_NAV = [
  { href: '/admin/dashboard',  label: 'Home',    icon: 'dashboard' },
  { href: '/admin/orders',     label: 'Orders',  icon: 'receipt_long' },
  { href: '/admin/products',   label: 'Products',icon: 'inventory_2' },
  { href: '/admin/analytics',  label: 'Reports', icon: 'bar_chart' },
  { href: '/admin/profiles',   label: 'Team',    icon: 'group' },
]

export default function AdminShell({ role, children, badges, name, permissions, notifications }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop sidebar ── */}
      <AdminSidebar
        role={role}
        badges={badges}
        name={name}
        permissions={permissions}
        className="hidden lg:flex sticky top-0 self-start flex-shrink-0"
      />

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-72 max-w-[80vw]">
            <AdminSidebar role={role} badges={badges} name={name} permissions={permissions} onClose={() => setMobileOpen(false)} className="w-full h-full" />
          </div>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-primary border-b-2 border-primary">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 text-white/70 hover:text-white transition-colors"
            >
              <Menu size={24} />
            </button>
            <Logo className="h-9 w-auto" />
          </div>
          <NotificationBell items={notifications ?? []} variant="mobile" />
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-40 items-center justify-between px-8 h-16 bg-white border-b-2 border-table-border shadow-sm">
          <h2 className="font-black text-xl text-primary tracking-tight uppercase">Admin Panel</h2>
          <div className="flex items-center gap-2">
            <NotificationBell items={notifications ?? []} variant="desktop" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center h-16 px-2 bg-primary border-t-2 border-primary/50 shadow-[0px_-4px_20px_rgba(0,0,0,0.25)]" style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
          {BOTTOM_NAV.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all',
                  active
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/80',
                )}
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className="font-black text-[9px] uppercase tracking-wider">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
