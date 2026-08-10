import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isPersonName, isEmail } from '@/lib/validators'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, email } = body || {}

  if (!isPersonName(name)) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
  }

  let cleanEmail: string | null = null
  if (email !== undefined && email !== null && email !== '') {
    if (!isEmail(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    const normalized = (email as string).trim().toLowerCase()
    if (/@bcrtraders\.internal$/i.test(normalized)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    cleanEmail = normalized
  }

  const admin = createAdminClient()
  const upsertRow: Record<string, unknown> = { id: userId, name: (name as string).trim() }
  if (cleanEmail) upsertRow.email = cleanEmail

  const { error } = await admin.from('profiles').upsert(upsertRow, { onConflict: 'id' })

  if (error) {
    console.error('[save-profile] error:', error.message)
    return NextResponse.json({ error: 'Could not save profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
