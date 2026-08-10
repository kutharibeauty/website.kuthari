import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import ProductForm from '../ProductForm'
import type { Product } from '@/types/database.types'

export const metadata: Metadata = { title: 'Edit Product | Kuthari Admin' }

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const [productRes, categoriesRes] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase.from('categories').select('*').eq('is_active', true).order('display_order'),
  ])

  if (!productRes.data) notFound()

  return (
    <ProductForm
      product={productRes.data as Product}
      categories={categoriesRes.data ?? []}
    />
  )
}
