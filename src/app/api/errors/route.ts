import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import type { AuthMetadata } from '@/types'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // Public endpoint: cap how fast one visitor can write to the error log.
  const rl = await rateLimit({ key: `errors:ip:${getClientIp(req)}`, limit: 20, windowSec: 600 })
  if (!rl.ok) return rateLimitResponse(rl)
  let body: { message?: string; stack?: string | null; digest?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { sessionClaims } = await auth()
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const userId = meta?.supabase_profile_id ?? null

  await logError({
    route: (req.headers.get('referer') ?? 'client').slice(0, 300),
    message: String(body.message ?? 'Unknown client error').slice(0, 500),
    code: body.digest ? String(body.digest).slice(0, 100) : null,
    stack: body.stack ? String(body.stack).slice(0, 4000) : null,
    userId,
  })

  return NextResponse.json({ ok: true })
}
