// Serves the store's images from the R2 bucket `kuthari-media`, and accepts
// uploads from the Next.js app.
//
//   GET/HEAD /<key>   public, cached for a year (keys are never reused)
//   PUT      /<key>   needs `Authorization: Bearer <UPLOAD_SECRET>`; images only
//   DELETE   /<key>   needs the same header
//
// Bindings: MEDIA (R2 bucket), UPLOAD_SECRET (secret).

const MAX_BYTES = 10 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic'])
const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._\-\/ ()%]{0,400}$/

async function authorized(request, secret) {
  const got = request.headers.get('authorization') || ''
  const want = `Bearer ${secret}`
  const enc = new TextEncoder()
  const a = enc.encode(got)
  const b = enc.encode(want)
  if (!secret || a.byteLength !== b.byteLength) return false
  return crypto.subtle.timingSafeEqual(a, b)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    let key
    try { key = decodeURIComponent(url.pathname.slice(1)) } catch { return new Response('Bad key', { status: 400 }) }

    if (request.method === 'PUT' || request.method === 'DELETE') {
      if (!(await authorized(request, env.UPLOAD_SECRET))) return new Response('Unauthorized', { status: 401 })
      if (!KEY_RE.test(key) || key.includes('..')) return new Response('Bad key', { status: 400 })
      if (request.method === 'DELETE') {
        await env.MEDIA.delete(key)
        return new Response(null, { status: 204 })
      }
      const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      if (!IMAGE_TYPES.has(type)) return new Response('Images only', { status: 415 })
      const len = Number(request.headers.get('content-length') || 0)
      if (!len || len > MAX_BYTES) return new Response('Too large', { status: 413 })
      await env.MEDIA.put(key, request.body, {
        httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
      })
      return Response.json({ key, url: `${url.origin}/${encodeURI(key)}` }, { status: 201 })
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } })
    }
    if (!key) return new Response('Not found', { status: 404 })

    const obj = await env.MEDIA.get(key, { onlyIf: request.headers })
    if (!obj) return new Response('Not found', { status: 404, headers: { 'cache-control': 'public, max-age=60' } })

    const headers = new Headers()
    obj.writeHttpMetadata(headers)
    headers.set('etag', obj.httpEtag)
    headers.set('cache-control', 'public, max-age=31536000, immutable')
    headers.set('access-control-allow-origin', '*')
    headers.set('x-content-type-options', 'nosniff')
    headers.set('content-security-policy', "default-src 'none'")

    if (!('body' in obj)) return new Response(null, { status: 304, headers })
    return new Response(request.method === 'HEAD' ? null : obj.body, { headers })
  },
}
