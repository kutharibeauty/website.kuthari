import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import CategoryForm from '../CategoryForm'
import type { Category } from '@/types/database.types'

export const metadata: Metadata = { title: 'Edit Category | Kuthari Admin' }

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const [categoryRes, allRes] = await Promise.all([
    supabase.from('categories').select('*').eq('id', id).maybeSingle(),
    supabase.from('categories').select('*').order('display_order'),
  ])

  if (!categoryRes.data) notFound()

  return (
    <CategoryForm
      category={categoryRes.data as Category}
      allCategories={(allRes.data ?? []) as Category[]}
    />
  )
}
