import { createClient, hasStaffCookie } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Session keep-alive. Called periodically by <SessionKeepAlive/>.
 *
 * This is a Route Handler, so the server Supabase client CAN write cookies here.
 * Calling getUser() refreshes the access token when it's near expiry and persists
 * the rotated tokens back into the cookies — keeping the session alive for idle
 * tabs. The browser client no longer refreshes on its own (see lib/supabase/client),
 * so this server-side refresh is the single, drift-free source of rotation.
 */
export async function GET() {
  try {
    // Refresh BOTH sessions that may be present — the store (customer) cookie and
    // the separate staff (admin/delivery) cookie — so an idle tab on either
    // portal keeps its own session alive independently.
    const store = await createClient()
    const { data: { user } } = await store.auth.getUser()

    let staffUser = null
    if (await hasStaffCookie()) {
      const staff = await createClient({ staff: true })
      const res = await staff.auth.getUser()
      staffUser = res.data.user
    }

    return NextResponse.json({ ok: !!user || !!staffUser }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }
}
