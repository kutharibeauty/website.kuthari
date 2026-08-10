import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

type BulkAction = 'activate' | 'deactivate' | 'delete'

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { action, ids } = await req.json() as { action: BulkAction; ids: string[] }

  if (!['activate', 'deactivate', 'delete'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
  }

  const supabase = createAdminClient()

  let error
  if (action === 'delete') {
    ;({ error } = await supabase.from('products').delete().in('id', ids))
  } else {
    ;({ error } = await supabase
      .from('products')
      .update({ is_active: action === 'activate', updated_at: new Date().toISOString() })
      .in('id', ids))
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: ids.length })
}
