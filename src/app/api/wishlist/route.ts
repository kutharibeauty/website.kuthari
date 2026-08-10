import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'

async function getProfileId(): Promise<string | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return null
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  return meta?.supabase_profile_id ?? null
}

// List the current customer's wishlisted product ids.
export async function GET() {
  const profileId = await getProfileId()
  if (!profileId) return Response.json({ ids: [] })
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).from('wishlists').select('product_id').eq('user_id', profileId)
  if (error) return Response.json({ ids: [] }) // table may not exist yet (pre-migration)
  return Response.json({ ids: (data ?? []).map((r: { product_id: string }) => r.product_id) })
}

// Add a product to the wishlist (idempotent).
export async function POST(request: Request) {
  const profileId = await getProfileId()
  if (!profileId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { product_id } = await request.json().catch(() => ({}))
  if (!product_id || typeof product_id !== 'string') return Response.json({ error: 'product_id required' }, { status: 400 })
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('wishlists').upsert({ user_id: profileId, product_id }, { onConflict: 'user_id,product_id' })
  if (error) return Response.json({ error: 'Could not save' }, { status: 500 })
  return Response.json({ ok: true })
}

// Remove a product from the wishlist.
export async function DELETE(request: Request) {
  const profileId = await getProfileId()
  if (!profileId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { product_id } = await request.json().catch(() => ({}))
  if (!product_id || typeof product_id !== 'string') return Response.json({ error: 'product_id required' }, { status: 400 })
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('wishlists').delete().eq('user_id', profileId).eq('product_id', product_id)
  if (error) return Response.json({ error: 'Could not remove' }, { status: 500 })
  return Response.json({ ok: true })
}
