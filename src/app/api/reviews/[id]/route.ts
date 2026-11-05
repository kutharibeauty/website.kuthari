import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { withStorefrontRefresh } from '@/lib/revalidate'
import { requirePermission } from '@/lib/auth/guard'
import { revalidateTag } from 'next/cache'

type Params = { params: Promise<{ id: string }> }

async function guard() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

async function PATCH_handler(req: NextRequest, { params }: Params) {
  const noPerm = await requirePermission('manage_products'); if (noPerm) return noPerm
  const err = await guard(); if (err) return err
  const { id } = await params
  const { is_approved } = await req.json() as { is_approved: boolean }
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('reviews')
    .update({ is_approved })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateTag('admin-badges', { expire: 0 })
  return NextResponse.json({ ok: true })
}

async function DELETE_handler(_req: NextRequest, { params }: Params) {
  const noPerm = await requirePermission('manage_products'); if (noPerm) return noPerm
  const err = await guard(); if (err) return err
  const { id } = await params
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('reviews')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateTag('admin-badges', { expire: 0 })
  return NextResponse.json({ ok: true })
}

export const PATCH = withStorefrontRefresh(PATCH_handler)
export const DELETE = withStorefrontRefresh(DELETE_handler)
