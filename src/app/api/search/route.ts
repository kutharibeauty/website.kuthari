import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q        = searchParams.get('q')?.trim() ?? ''
  const category = searchParams.get('category')?.trim() ?? ''
  const featured = searchParams.get('featured') === 'true'
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '40'), 100)

  const supabase = await createClient()
  const db = supabase as any

  let query = db
    .from('products')
    .select('*, categories(id, name, name_or, slug)')
    .eq('is_active', true)
    .order('display_order')
    .limit(limit)

  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,tags.cs.{${q}}`)
  }

  if (category) {
    const { data: cat } = await db
      .from('categories')
      .select('id')
      .eq('slug', category)
      .eq('is_active', true)
      .maybeSingle()
    if (cat?.id) {
      query = query.eq('category_id', cat.id)
    }
  }

  if (featured) {
    query = query.eq('is_featured', true)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ products: data ?? [], total: (data ?? []).length })
}
