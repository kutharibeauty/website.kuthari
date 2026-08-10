import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { writeStrippingMissingColumns } from '@/lib/supabase/tolerant-write'

type Params = { params: Promise<{ id: string }> }

function adminOnly(role?: string) {
  return role !== 'super_admin' && role !== 'admin'
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (adminOnly(meta?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()
  // Tolerate columns the drifted live table lacks (e.g. `icon`).
  const { error } = await writeStrippingMissingColumns(body, (payload) =>
    supabase.from('categories').update(payload).eq('id', id),
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (adminOnly(meta?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const allowed = ['is_active', 'display_order']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('categories').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (adminOnly(meta?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = createAdminClient()

  // products.category_id is ON DELETE RESTRICT, deliberately: deleting a
  // category must never take its products with it. So check FIRST and explain,
  // rather than letting Postgres reject it and surfacing an opaque FK error.
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)

  if (countError) {
    console.error('[categories/DELETE] product count failed:', countError.message)
    return NextResponse.json({ error: 'Could not check this category. Please try again.' }, { status: 500 })
  }

  const productCount = count ?? 0
  if (productCount > 0) {
    return NextResponse.json(
      {
        error: `This category has ${productCount} product${productCount === 1 ? '' : 's'} assigned. Reassign ${productCount === 1 ? 'it' : 'them'} to another category first, or deactivate this category instead of deleting it.`,
        code: 'CATEGORY_HAS_PRODUCTS',
        productCount,
      },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) {
    // Never hand a raw Postgres message to the client.
    console.error('[categories/DELETE] delete failed:', error.message)
    return NextResponse.json({ error: 'Could not delete this category. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
