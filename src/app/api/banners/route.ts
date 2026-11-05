import { createClient, createAdminClient } from '@/lib/supabase/server'
import { writeStrippingMissingColumns } from '@/lib/supabase/tolerant-write'
import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { withStorefrontRefresh } from '@/lib/revalidate'
import { requireAdmin, requirePermission } from '@/lib/auth/guard'

export async function GET(req: NextRequest) {
  const admin = req.nextUrl.searchParams.get('admin') === 'true'
  if (admin) {
    // The full list (inactive and private rows included) is for staff only.
    const denied = await requireAdmin(); if (denied) return denied
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('banners').select('*').order('display_order')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('banners').select('*').eq('is_active', true).order('display_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

async function POST_handler(req: NextRequest) {
  const noPerm = await requirePermission('manage_banners'); if (noPerm) return noPerm
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const supabase = createAdminClient()
  // See PUT: display_seconds may not exist on the live table yet.
  const { data, error } = await writeStrippingMissingColumns(body, (payload) =>
    supabase.from('banners').insert(payload).select('id').single(),
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export const POST = withStorefrontRefresh(POST_handler)
