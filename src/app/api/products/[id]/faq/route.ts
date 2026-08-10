import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildFaqRow } from '@/lib/faq'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('product_faqs')
    .select('*')
    .eq('product_id', id)
    .order('display_order', { ascending: true })

  if (error?.code === '42P01') return NextResponse.json([])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: Params) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  // Whitelist + sanitize: never spread the raw body (mass assignment), and the
  // answer fields are rendered as HTML on the public product page.
  const row = buildFaqRow(body)
  if (typeof row.question !== 'string' || !row.question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('product_faqs')
    .insert({ ...row, product_id: id })
    .select()
    .single()

  if (error?.code === '42P01') {
    return NextResponse.json(
      { error: 'product_faqs table not found. Run DB migration.' },
      { status: 503 },
    )
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
