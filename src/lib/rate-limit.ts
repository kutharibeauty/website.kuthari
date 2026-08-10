type RateLimitOk = { ok: true; remaining: number; reset: number }
type RateLimitDenied = { ok: false; remaining: 0; reset: number; retryAfterSec: number }
export type RateLimitResult = RateLimitOk | RateLimitDenied

const memoryStore = new Map<string, { count: number; resetAt: number }>()

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function upstashIncr(key: string, ttlSeconds: number): Promise<{ count: number; ttl: number } | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null
  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(ttlSeconds), 'NX'],
        ['TTL', key],
      ]),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ result: number | string }>
    const count = Number(data?.[0]?.result ?? 0)
    const ttl = Number(data?.[2]?.result ?? ttlSeconds)
    return { count, ttl: ttl > 0 ? ttl : ttlSeconds }
  } catch (err) {
    console.error('[rate-limit] upstash error', err)
    return null
  }
}

function memoryIncr(key: string, ttlSeconds: number) {
  const now = Date.now()
  const existing = memoryStore.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + ttlSeconds * 1000
    memoryStore.set(key, { count: 1, resetAt })
    return { count: 1, ttl: ttlSeconds }
  }
  existing.count += 1
  memoryStore.set(key, existing)
  return { count: existing.count, ttl: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) }
}

export async function rateLimit(opts: { key: string; limit: number; windowSec: number }): Promise<RateLimitResult> {
  const fullKey = `rl:${opts.key}:${opts.windowSec}`
  const result = (await upstashIncr(fullKey, opts.windowSec)) ?? memoryIncr(fullKey, opts.windowSec)
  const reset = Math.floor(Date.now() / 1000) + result.ttl
  if (result.count > opts.limit) {
    return { ok: false, remaining: 0, reset, retryAfterSec: result.ttl }
  }
  return { ok: true, remaining: Math.max(0, opts.limit - result.count), reset }
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || '0.0.0.0'
}

export function rateLimitResponse(result: RateLimitDenied) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down and try again later.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(result.retryAfterSec) } },
  )
}
