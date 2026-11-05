/**
 * The site's public address, for links that leave the page: sitemap, robots,
 * canonical URLs, structured data, the merchant feed and email links.
 *
 * Comes from NEXT_PUBLIC_APP_URL (or NEXT_PUBLIC_SITE_URL), but a localhost
 * value is ignored on a production build. A copied .env once put
 * http://localhost:3000 into the live sitemap and every email link this way.
 */
const PRODUCTION_URL = 'https://www.kutharibeauty.com'

function resolve(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '')
  if (!raw) return PRODUCTION_URL
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(raw)
  if (local && process.env.NODE_ENV === 'production') return PRODUCTION_URL
  return raw
}

export const SITE_URL = resolve()
