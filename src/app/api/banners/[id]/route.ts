import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { writeStrippingMissingColumns } from '@/lib/supabase/tolerant-write'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { withStorefrontRefresh } from '@/lib/revalidate'
import { requirePermission } from '@/lib/auth/guard'

type Params = { params: Promise<{ id: string }> }

function isAdmin(role?: string) {
  return role === 'super_admin' || role === 'admin'
}

async function guard() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (!isAdmin(meta?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

async function PUT_handler(req: NextRequest, { params }: Params) {
  const noPerm = await requirePermission('manage_banners'); if (noPerm) return noPerm
  const err = await guard(); if (err) return err
  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()
  // display_seconds only exists once migration 029 has run; strip-and-retry so
  // saving a banner still works on a DB that hasn't been migrated yet.
  const { error } = await writeStrippingMissingColumns(body, (payload) =>
    supabase.from('banners').update(payload).eq('id', id),
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

async function PATCH_handler(req: NextRequest, { params }: Params) {
  const noPerm = await requirePermission('manage_banners'); if (noPerm) return noPerm
  const err = await guard(); if (err) return err
  const { id } = await params
  const body = await req.json()
  const allowed = ['is_active', 'display_order', 'display_seconds']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}
  for (const k of allowed) { if (k in body) update[k] = body[k] }
  if (!Object.keys(update).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('banners').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

async function DELETE_handler(_req: NextRequest, { params }: Params) {
  const noPerm = await requirePermission('manage_banners'); if (noPerm) return noPerm
  const err = await guard(); if (err) return err
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('banners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export const PUT = withStorefrontRefresh(PUT_handler)
export const PATCH = withStorefrontRefresh(PATCH_handler)
export const DELETE = withStorefrontRefresh(DELETE_handler)
