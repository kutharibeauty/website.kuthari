import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import BannersClient, { type AisleCategory } from './BannersClient'
import type { Banner, CmsContent } from '@/types/database.types'

export const metadata: Metadata = { title: 'Banners & CMS | Kuthari Admin' }
export const revalidate = 0

export default async function BannersPage() {
  const supabase = createAdminClient()

  const [bannersRes, cmsRes, categoriesRes, productsRes] = await Promise.all([
    supabase.from('banners').select('*').order('display_order'),
    supabase.from('cms_content').select('*'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('categories').select('id, name, slug').eq('is_active', true).order('display_order'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('products').select('category_id, images').eq('is_active', true).order('display_order'),
  ])

  // The photo a "What's on your list" card shows when the admin hasn't picked
  // one: the first product photo in that category (same rule as the homepage).
  const autoPhoto: Record<string, string> = {}
  for (const p of (productsRes.data ?? []) as { category_id: string | null; images: string[] | null }[]) {
    if (p.category_id && !autoPhoto[p.category_id] && p.images?.[0]) autoPhoto[p.category_id] = p.images[0]
  }
  const categories: AisleCategory[] = ((categoriesRes.data ?? []) as { id: string; name: string; slug: string }[])
    .map((c) => ({ ...c, autoPhoto: autoPhoto[c.id] ?? null }))

  return (
    <BannersClient
      initialBanners={(bannersRes.data ?? []) as Banner[]}
      cmsContent={(cmsRes.data ?? []) as CmsContent[]}
      categories={categories}
    />
  )
}
