import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { sanitizeRichText } from '@/lib/sanitize'
import FaqClient from './FaqClient'
import type { ProductFAQ } from '@/types/database.types'

export const metadata: Metadata = { title: 'FAQ | Kuthari Admin' }
export const revalidate = 0

export default async function FaqPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const [productRes, categoryRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('products')
      .select('id, name, category_id')
      .eq('id', id)
      .maybeSingle(),
    // Fetch FAQs — graceful if table missing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('product_faqs')
      .select('*')
      .eq('product_id', id)
      .order('display_order', { ascending: true }),
  ])

  if (!productRes.data) notFound()

  const product = productRes.data as { id: string; name: string; category_id: string | null }
  const faqRes = categoryRes

  // Resolve category name for smart FAQ templates
  let categoryName = ''
  if (product.category_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cat } = await (supabase as any)
      .from('categories')
      .select('name')
      .eq('id', product.category_id)
      .maybeSingle()
    categoryName = (cat as { name?: string } | null)?.name ?? ''
  }

  const tableExists = !faqRes.error || faqRes.error?.code !== '42P01'
  // Sanitize stored answer HTML before it reaches the client editor/preview, so
  // a rogue-authored <script>/onerror can't run in the admin panel either.
  const faqs = tableExists
    ? ((faqRes.data ?? []) as ProductFAQ[]).map((f) => ({
        ...f,
        answer: sanitizeRichText(f.answer),
        answer_or: f.answer_or ? sanitizeRichText(f.answer_or) : f.answer_or,
      }))
    : []

  return (
    <FaqClient
      productId={id}
      productName={product.name}
      categoryName={categoryName}
      initialFaqs={faqs}
      tableExists={tableExists}
    />
  )
}
