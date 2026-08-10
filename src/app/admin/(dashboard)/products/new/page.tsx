import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import ProductForm from '../ProductForm'

export const metadata: Metadata = { title: 'New Product | Kuthari Admin' }

export default async function NewProductPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  return <ProductForm categories={data ?? []} />
}
