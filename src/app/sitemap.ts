import type { MetadataRoute } from 'next'

export const revalidate = 21600 // rebuild at most every 6 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kutharibeauty.com'

  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('products').select('slug, updated_at').eq('is_active', true),
    supabase.from('categories').select('slug, updated_at').eq('is_active', true),
  ])

  const now = new Date()

  // Only indexable, public pages belong in the sitemap — private/utility
  // routes (cart, orders, profile, login) are disallowed in robots.txt.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl,             lastModified: now, changeFrequency: 'daily',  priority: 1.0 },
    { url: `${siteUrl}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    ...['contact', 'shipping-policy', 'refund-policy', 'privacy', 'terms'].map((p) => ({
      url: `${siteUrl}/${p}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ]

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((cat) => ({
    url: `${siteUrl}/category/${cat.slug}`,
    lastModified: new Date(cat.updated_at ?? now),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${siteUrl}/product/${p.slug}`,
    lastModified: new Date(p.updated_at ?? now),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...categoryRoutes, ...productRoutes]
}
