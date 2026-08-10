import { createClient, createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { skuPrefix } from '@/lib/products/sku'
import type { AuthMetadata } from '@/types'

async function generateSku(categoryId: string, supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cat } = await (supabase as any)
    .from('categories')
    .select('slug')
    .eq('id', categoryId)
    .maybeSingle()

  const prefix = skuPrefix(cat?.slug)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('products')
    .select('id', { count: 'exact', head: true })
    .like('sku', `${prefix}%`)

  const seq = ((count as number | null) ?? 0) + 1
  return `${prefix}${seq.toString().padStart(4, '0')}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const categoryId = searchParams.get('category_id')
  const featured = searchParams.get('featured')
  const search = searchParams.get('q')
  const limit = Number(searchParams.get('limit') ?? '24')
  const page = Number(searchParams.get('page') ?? '1')
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('display_order')
    .range(offset, offset + limit - 1)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (featured === 'true') query = query.eq('is_featured', true)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const supabase = createAdminClient()

  // Auto-generate SKU if omitted and category_id is known
  if (!body.sku && body.category_id) {
    body.sku = await generateSku(body.category_id, supabase)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('products')
    .insert(body)
    .select('id, sku')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
