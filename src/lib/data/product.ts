import { createClient } from '@/lib/supabase/server'
import { sanitizeRichText } from '@/lib/sanitize'
import type { Category, Product, ProductFAQ, ProductReview } from '@/types/database.types'

export interface RatingStats {
  avg: number
  count: number
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>
}

export interface ProductPageData {
  product: Product
  category: Category | null
}

export async function getProductBySlug(slug: string): Promise<ProductPageData | null> {
  const supabase = await createClient()

  const { data: rawProduct } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  const product = rawProduct as unknown as Product | null
  if (!product) return null

  const category = product.category_id
    ? await supabase
        .from('categories')
        .select('*')
        .eq('id', product.category_id)
        .maybeSingle()
        .then((r) => (r.data as unknown as Category | null) ?? null)
    : null

  return { product, category }
}

/**
 * FAQ answers are rich text rendered with dangerouslySetInnerHTML on the public
 * product page. Sanitize HERE — the renderer is a client component and can't
 * import the server-only sanitizer, so cleaning at this choke point guarantees
 * every consumer gets safe HTML. Without this, anything stored in an answer
 * (a fake login form, a bogus download button, phishing markup) renders live —
 * stored XSS, and exactly what gets a site flagged as a "deceptive page".
 */
export async function getProductFAQs(productId: string): Promise<ProductFAQ[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('product_faqs')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('display_order')
  const faqs = (data ?? []) as unknown as ProductFAQ[]
  return faqs.map((f) => ({
    ...f,
    answer: sanitizeRichText(f.answer),
    answer_or: f.answer_or ? sanitizeRichText(f.answer_or) : f.answer_or,
  }))
}

export async function getProductReviews(
  productId: string,
  limit = 10,
): Promise<{ reviews: ProductReview[]; stats: RatingStats }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  const reviews = (data ?? []) as unknown as ProductReview[]

  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0
  reviews.forEach((r) => {
    const star = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5
    if (star >= 1 && star <= 5) breakdown[star]++
    total += r.rating
  })

  return {
    reviews,
    stats: {
      avg: reviews.length ? Number((total / reviews.length).toFixed(1)) : 0,
      count: reviews.length,
      breakdown,
    },
  }
}

export async function getRelatedProducts(
  categoryId: string,
  excludeId: string,
  limit = 4,
): Promise<Product[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .neq('id', excludeId)
    .order('is_featured', { ascending: false })
    .order('display_order')
    .limit(limit)
  return data ?? []
}
