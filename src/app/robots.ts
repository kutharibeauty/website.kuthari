import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = SITE_URL
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/delivery/',
          '/api/',
          '/checkout',
          '/orders',
          '/profile',
          '/_next/',
          '/static/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
