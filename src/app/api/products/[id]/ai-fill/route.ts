import { NextRequest, NextResponse, after } from 'next/server'
import { requirePermission } from '@/lib/auth/guard'
import { createAdminClient } from '@/lib/supabase/server'
import { isAIConfigured } from '@/lib/ai/openrouter'
import { writeDescription, writeSeo } from '@/lib/ai/product-copy'
import { withStorefrontRefresh } from '@/lib/revalidate'
import { notifySearchEngines } from '@/lib/seo/search-notify'

// Free AI models can be slow (a description can take a minute or more).
export const maxDuration = 300

const filled = (v: unknown) => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim().length > 0

/**
 * POST /api/products/[id]/ai-fill — write one part of a product's content with
 * AI and save it. Body: { part: 'description' | 'seo', overwrite?: boolean }.
 * Without overwrite, a part that already has content is skipped. One part per
 * request keeps each call well inside the time limit.
 */
async function POST_handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const noPerm = await requirePermission('manage_products'); if (noPerm) return noPerm
  if (!isAIConfigured()) return NextResponse.json({ error: 'AI is not configured. Add OPENROUTER_API_KEY in Vercel.' }, { status: 503 })

  const { id } = await params
  const { part, overwrite = false } = await req.json().catch(() => ({})) as { part?: 'description' | 'seo'; overwrite?: boolean }
  if (part !== 'description' && part !== 'seo') return NextResponse.json({ error: 'part must be description or seo' }, { status: 400 })

  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: p } = await (db as any)
    .from('products')
    .select('id, name, brand, unit, price, retail_price, description, description_or, meta_title, meta_description, tags, category_id, categories(name)')
    .eq('id', id)
    .maybeSingle()
  if (!p) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const facts = {
    name: p.name as string,
    brand: p.brand as string | null,
    category: (p.categories as { name?: string } | null)?.name ?? null,
    price: Number(p.retail_price) > 0 ? Number(p.retail_price) : Number(p.price),
    unit: p.unit as string | null,
    description: p.description as string | null,
  }

  try {
    if (part === 'description') {
      if (!overwrite && filled(p.description)) return NextResponse.json({ skipped: true })
      const out = await writeDescription(facts)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any).from('products')
        .update({ description: out.description, description_or: out.description_or || p.description_or, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      after(() => notifySearchEngines({ productIds: [id] }))
      return NextResponse.json({ updated: true })
    }

    if (!overwrite && filled(p.meta_title) && filled(p.meta_description)) return NextResponse.json({ skipped: true })
    const seo = await writeSeo(facts)
    const tags = overwrite || !Array.isArray(p.tags) || !p.tags.length
      ? seo.keywords
      : [...new Set([...(p.tags as string[]), ...seo.keywords])].slice(0, 20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).from('products')
      .update({
        meta_title: overwrite || !filled(p.meta_title) ? seo.meta_title : p.meta_title,
        meta_description: overwrite || !filled(p.meta_description) ? seo.meta_description : p.meta_description,
        tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    after(() => notifySearchEngines({ productIds: [id] }))
    return NextResponse.json({ updated: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'AI failed' }, { status: 502 })
  }
}

export const POST = withStorefrontRefresh(POST_handler)
