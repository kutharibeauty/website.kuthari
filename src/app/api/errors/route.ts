import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import type { AuthMetadata } from '@/types'

export async function POST(req: NextRequest) {
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
    route: req.headers.get('referer') ?? 'client',
    message: body.message ?? 'Unknown client error',
    code: body.digest ?? null,
    stack: body.stack ?? null,
    userId,
  })

  return NextResponse.json({ ok: true })
}
