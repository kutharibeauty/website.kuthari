import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import CategoryForm from '../CategoryForm'

export const metadata: Metadata = { title: 'New Category | Kuthari Admin' }

export default async function NewCategoryPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('display_order')

  return <CategoryForm allCategories={data ?? []} />
}
