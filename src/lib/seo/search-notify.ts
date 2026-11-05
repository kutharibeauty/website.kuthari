import 'server-only'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site-url'

/**
 * Tell search engines that products changed. Called after a product is added,
 * edited or imported. Each part switches itself on only when its keys are set,
 * and never throws: a failed ping must not fail a product save.
 *
 *  - Google: resubmits /sitemap.xml through the Search Console API (Google
 *    retired its old "ping" URL in 2023). Needs a Google Cloud service account
 *    added as an Owner of the Search Console property:
 *      GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY (the private key),
 *      GSC_PROPERTY (optional; default "sc-domain:kutharibeauty.com").
 *  - IndexNow (Bing, Yandex, Seznam, Naver…): sends the changed product URLs
 *    straight away. Needs INDEXNOW_KEY; the key is published at /indexnow-key.txt.
 */
export async function notifySearchEngines(opts: { productIds?: string[]; since?: string } = {}): Promise<void> {
  try {
    const urls = await productUrls(opts)
    const results = await Promise.allSettled([submitSitemapToGoogle(), pingIndexNow(urls)])
    results.forEach((r) => { if (r.status === 'rejected') console.error('[search-notify]', r.reason) })
  } catch (e) {
    console.error('[search-notify]', e)
  }
}

async function productUrls({ productIds, since }: { productIds?: string[]; since?: string }): Promise<string[]> {
  if (!productIds?.length && !since) return []
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any).from('products').select('slug').eq('is_active', true).limit(500)
  if (productIds?.length) q = q.in('id', productIds)
  else if (since) q = q.gte('updated_at', since)
  const { data } = await q
  return ((data ?? []) as { slug: string }[]).map((p) => `${SITE_URL}/product/${p.slug}`)
}

// ── Google Search Console ───────────────────────────────────────────────────

let lastGoogleSubmit = 0

async function googleAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) return null
  const now = Math.floor(Date.now() / 1000)
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: email,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(key, 'base64url')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text()).slice(0, 160)}`)
  return ((await res.json()) as { access_token: string }).access_token
}

async function submitSitemapToGoogle(): Promise<void> {
  // A bulk edit can save many products in a row; once every 10 minutes is plenty.
  if (Date.now() - lastGoogleSubmit < 10 * 60_000) return
  const token = await googleAccessToken()
  if (!token) return
  const property = process.env.GSC_PROPERTY || 'sc-domain:kutharibeauty.com'
  const sitemap = `${SITE_URL}/sitemap.xml`
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/sitemaps/${encodeURIComponent(sitemap)}`,
    { method: 'PUT', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) },
  )
  if (!res.ok) throw new Error(`Search Console sitemap submit ${res.status}: ${(await res.text()).slice(0, 160)}`)
  lastGoogleSubmit = Date.now()
}

// ── IndexNow ────────────────────────────────────────────────────────────────

async function pingIndexNow(urls: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY
  if (!key || !urls.length) return
  const host = new URL(SITE_URL).host
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `${SITE_URL}/indexnow-key.txt`, urlList: urls.slice(0, 10_000) }),
    signal: AbortSignal.timeout(10_000),
  })
  // 200 and 202 both mean accepted.
  if (res.status !== 200 && res.status !== 202) throw new Error(`IndexNow ${res.status}`)
}
