import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import CategoriesClient from './CategoriesClient'

export const metadata: Metadata = { title: 'Categories | Kuthari Admin' }
export const revalidate = 0

export default async function CategoriesPage() {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const [categoriesRes, productsRes] = await Promise.all([
    db.from('categories').select('*').order('display_order'),
    db.from('products').select('category_id').eq('is_active', true),
  ])

  const productCounts: Record<string, number> = {}
  for (const p of (productsRes.data ?? []) as Array<{ category_id: string | null }>) {
    if (p.category_id) {
      productCounts[p.category_id] = (productCounts[p.category_id] ?? 0) + 1
    }
  }

  return (
    <CategoriesClient
      initialCategories={categoriesRes.data ?? []}
      productCounts={productCounts}
    />
  )
}
