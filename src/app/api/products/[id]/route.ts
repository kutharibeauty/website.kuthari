import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse, after } from 'next/server'
import type { AuthMetadata } from '@/types'
import { withStorefrontRefresh } from '@/lib/revalidate'
import { requirePermission } from '@/lib/auth/guard'
import { notifySearchEngines } from '@/lib/seo/search-notify'

const PATCHABLE = ['stock_qty', 'price', 'is_active', 'is_featured', 'display_order'] as const

export async function GET() {
  return NextResponse.json({})
}

async function PATCH_handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const noPerm = await requirePermission('manage_products'); if (noPerm) return noPerm
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of PATCHABLE) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('products')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  after(() => notifySearchEngines({ productIds: [id] }))
  return NextResponse.json({ ok: true })
}

/** Columns the client must never set: identity and bookkeeping. */
function stripProtected(body: unknown): Record<string, unknown> {
  const b = body && typeof body === 'object' && !Array.isArray(body) ? { ...(body as Record<string, unknown>) } : {}
  for (const k of ['id', 'created_at', 'updated_at', 'sku_seq']) delete b[k]
  return b
}

async function PUT_handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const noPerm = await requirePermission('manage_products'); if (noPerm) return noPerm
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = stripProtected(await req.json())

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('products')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  after(() => notifySearchEngines({ productIds: [id] }))
  return NextResponse.json({ ok: true })
}

export const PATCH = withStorefrontRefresh(PATCH_handler)
export const PUT = withStorefrontRefresh(PUT_handler)
