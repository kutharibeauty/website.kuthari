import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/guard'
import { createAdminClient } from '@/lib/supabase/server'

const filled = (v: unknown) => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim().length > 0

/**
 * GET /api/products/ai-fill — which products are missing AI-writable content,
 * for the Products page's "Fill with AI" window. Admin only.
 */
export async function GET() {
  const noPerm = await requirePermission('manage_products'); if (noPerm) return noPerm
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('products')
    .select('id, name, description, meta_title, meta_description, is_active')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const products = ((data ?? []) as { id: string; name: string; description: string | null; meta_title: string | null; meta_description: string | null; is_active: boolean }[])
    .map((p) => ({
      id: p.id,
      name: p.name,
      active: p.is_active,
      hasDescription: filled(p.description),
      hasSeo: filled(p.meta_title) && filled(p.meta_description),
    }))
  return NextResponse.json({ products })
}
