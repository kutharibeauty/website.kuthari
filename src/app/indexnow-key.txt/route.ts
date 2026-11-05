/**
 * GET /indexnow-key.txt — the IndexNow key, published so search engines can
 * confirm our pings really come from this site (see lib/seo/search-notify.ts).
 * The key is public by design; it only proves ownership of the host.
 */
export function GET() {
  const key = process.env.INDEXNOW_KEY
  if (!key) return new Response('Not found', { status: 404 })
  return new Response(key, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
