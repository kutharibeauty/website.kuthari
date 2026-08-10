import { createClient } from '@/lib/supabase/server'
import type { Category, Product } from '@/types/database.types'

export type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'newest'

export const PAGE_SIZE = 12

export interface GetCategoryProductsOptions {
  categoryId: string
  sort?: SortOption
  inStockOnly?: boolean
  page?: number
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  return data ?? null
}

export async function getCategoryProducts({
  categoryId,
  sort = 'featured',
  inStockOnly = false,
  page = 1,
}: GetCategoryProductsOptions): Promise<{ products: Product[]; total: number }> {
  const supabase = await createClient()

  // select('*') on purpose — the live schema has drifted, and naming a column
  // that doesn't exist fails the whole query and empties the grid.
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('category_id', categoryId)
    .eq('is_active', true)

  if (inStockOnly) query = query.gt('stock_qty', 0)

  switch (sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price', { ascending: false })
      break
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
  }

  const from = (page - 1) * PAGE_SIZE
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1)

  return { products: (data ?? []) as unknown as Product[], total: count ?? 0 }
}
