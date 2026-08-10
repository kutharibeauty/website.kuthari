import { createClient, createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { AuthMetadata } from '@/types'

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  const supabase = await createClient()

  let query = supabase.from('cms_content').select('*')
  if (key) query = query.eq('key', key)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(key ? (data?.[0] ?? null) : data)
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { key, value } = await req.json() as { key: string; value: unknown }
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  // Only write the columns the CMS actually needs. The LIVE cms_content table has
  // drifted from the migrations and is missing `is_active` (and possibly other
  // optional columns) — writing one that doesn't exist fails the whole upsert
  // ("Could not find the 'is_active' column ... in the schema cache"). key + value
  // are all that's required; any updated_at column with a default fills itself.
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('cms_content')
    .upsert({ key, value }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
