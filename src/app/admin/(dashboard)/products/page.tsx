import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import type { Product } from '@/types/database.types'
import ProductsClient from './ProductsClient'

export const metadata: Metadata = { title: 'Products | Kuthari Admin' }
export const revalidate = 0

export default async function ProductsPage() {
  const supabase = createAdminClient()

  const [productsRes, categoriesRes] = await Promise.all([
    // Only what the admin table renders. `select('*')` here pulled every heavy
    // column (HTML description, meta, keywords, variants…) for up to 500 rows.
    supabase
      .from('products')
      .select('id, name, sku, price, mrp, stock_qty, unit, category_id, is_active, is_featured, created_at, images')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <ProductsClient
      initialProducts={(productsRes.data ?? []) as unknown as Product[]}
      categories={(categoriesRes.data ?? []) as { id: string; name: string }[]}
    />
  )
}
