import { unstable_cache } from 'next/cache'
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import AdminShell from '@/components/layout/AdminShell'
import AdminToaster from '@/components/admin/AdminToaster'
import type { AdminPermissions } from '@/types/admin.types'
import type { AdminNotification } from '@/components/admin/NotificationBell'

/**
 * This layout wraps EVERY admin page, so everything below ran on every single
 * navigation — 3 DB queries before the page's own work even started. A layout
 * doing uncached DB work also BLOCKS the navigation (loading.tsx can't show
 * until it resolves), which is why admin pages took seconds and the skeleton
 * never appeared.
 *
 * These are sidebar chrome — a notification count and a display name — so a
 * short cache is fine and makes navigation immediate. Badges refresh within
 * 30s; the name within 5 min.
 */
const fetchBadges = unstable_cache(
  async () => {
    try {
      const supabase = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const [ordersRes, unserviceableRes] = await Promise.all([
        db.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'placed'),
        db.from('unserviceable_attempts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
      ])
      return {
        orders: ordersRes.count ?? 0,
        unserviceable: unserviceableRes.count ?? 0,
      }
    } catch {
      return { orders: 0, unserviceable: 0 }
    }
  },
  ['admin-badges'],
  { revalidate: 30, tags: ['admin-badges'] },
)

/**
 * The actual notification items behind the header bell — the newest unhandled
 * orders and recent unserviceable-pincode requests. Cached globally (same data
 * for every admin); the per-admin "viewed" state lives in the browser, and
 * per-admin permission filtering happens in the layout body below.
 */
const fetchNotifications = unstable_cache(
  async (): Promise<AdminNotification[]> => {
    try {
      const supabase = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
      // select('*') on purpose — the live schema has drifted, and naming a
      // missing column fails the whole PostgREST query (see fetchBadges/homepage).
      const [ordersRes, unserviceableRes] = await Promise.all([
        db.from('orders').select('*').eq('status', 'placed').order('created_at', { ascending: false }).limit(15),
        db.from('unserviceable_attempts').select('*').gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(15),
      ])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orders: AdminNotification[] = (ordersRes.data ?? []).map((o: any) => ({
        id: `order:${o.id}`,
        kind: 'order' as const,
        title: `New order ${o.order_number || '#' + String(o.id).slice(0, 8)}`,
        subtitle: [`₹${Number(o.total ?? 0).toLocaleString('en-IN')}`, o.address?.name]
          .filter(Boolean)
          .join(' · '),
        href: `/admin/orders/${o.id}`,
        createdAt: o.created_at,
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unserviceable: AdminNotification[] = (unserviceableRes.data ?? []).map((u: any) => ({
        id: `unserviceable:${u.id}`,
        kind: 'unserviceable' as const,
        title: `Unserviceable PIN ${u.pincode ?? ''}`.trim(),
        subtitle: [u.name, u.city].filter(Boolean).join(' · ') || 'Delivery request',
        href: '/admin/unserviceable',
        createdAt: u.created_at,
      }))
      // Newest first across both sources.
      return [...orders, ...unserviceable].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    } catch {
      return []
    }
  },
  ['admin-notifications'],
  { revalidate: 30, tags: ['admin-badges'] },
)

/**
 * The display name shown in the sidebar. Read from admin_profiles (the Auth
 * user_metadata copy is only set at account-creation time and goes stale).
 * Cached per user — it changes rarely.
 */
const fetchAdminProfile = unstable_cache(
  async (userId: string): Promise<{ name: string | null; permissions: AdminPermissions | null }> => {
    try {
      const supabase = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data } = await db
        .from('admin_profiles')
        .select('name, permissions')
        .eq('user_id', userId)
        .maybeSingle()
      return {
        name: (data?.name as string | undefined)?.trim() || null,
        permissions: (data?.permissions as AdminPermissions | undefined) ?? null,
      }
    } catch {
      return { name: null, permissions: null }
    }
  },
  ['admin-name'],
  { revalidate: 300, tags: ['admin-name'] },
)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/admin/login')

  const role = sessionClaims?.publicMetadata.role

  if (role !== 'super_admin' && role !== 'admin') redirect('/admin/login')

  // Role and permissions are resolved HERE, on the server, and handed to the
  // sidebar. It used to derive them from a browser-side session lookup, which
  // left a super_admin with an empty nav whenever that lookup came back without
  // a user — even though this layout had already authenticated them.
  const [badges, profile, allNotifications] = await Promise.all([
    fetchBadges(),
    fetchAdminProfile(userId),
    fetchNotifications(),
  ])

  // Only surface a notification the admin is actually allowed to act on — an
  // admin who can't view orders shouldn't see (or click through to) order alerts.
  const canViewOrders = role === 'super_admin' || !!profile.permissions?.view_orders
  const canViewUnserviceable = role === 'super_admin' || !!profile.permissions?.view_unserviceable
  const notifications = allNotifications.filter((n) =>
    n.kind === 'order' ? canViewOrders : canViewUnserviceable,
  )

  return (
    <>
      <AdminShell role={role} badges={badges} name={profile.name} permissions={profile.permissions} notifications={notifications}>{children}</AdminShell>
      <AdminToaster />
    </>
  )
}
