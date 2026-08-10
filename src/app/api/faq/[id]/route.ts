import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildFaqRow } from '@/lib/faq'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

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

export async function PUT(req: NextRequest, { params }: Params) {
  const err = await guard(); if (err) return err
  const { id } = await params
  const body = await req.json()
  const update = buildFaqRow(body)
  if (!Object.keys(update).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('product_faqs').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const err = await guard(); if (err) return err
  const { id } = await params
  const body = await req.json()
  const allowed = ['is_active', 'display_order']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}
  for (const k of allowed) { if (k in body) update[k] = body[k] }
  if (!Object.keys(update).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('product_faqs').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const err = await guard(); if (err) return err
  const { id } = await params
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('product_faqs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
