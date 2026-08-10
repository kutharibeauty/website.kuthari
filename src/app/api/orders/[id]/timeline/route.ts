import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse, after } from 'next/server'
import type { AuthMetadata } from '@/types'
import { mapTimelineRow } from '@/lib/orders/timeline'
import { notifyOrderEvent } from '@/lib/resend/notify'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('order_timeline')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  // Table may not exist yet — return empty array rather than 500
  if (error?.code === '42P01') return NextResponse.json([])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Map DB columns → the UI's field names.
  return NextResponse.json((data ?? []).map(mapTimelineRow))
}

export async function POST(req: NextRequest, { params }: Params) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null) as {
    status?: string
    title?: string
    message?: string
    estimated_delivery?: string
    email_subject?: string
    send_email?: boolean
  } | null

  if (!body?.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!body.status?.trim()) return NextResponse.json({ error: 'Status is required' }, { status: 400 })

  const supabase = createAdminClient()
  const message = body.message?.trim() || null
  const eta = body.estimated_delivery?.trim() || null

  // Insert using the REAL column names (description / estimated_time). Never
  // spread the request body — the UI's names don't match the table's.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('order_timeline')
    .insert({
      order_id: id,
      status: body.status.trim(),
      title: body.title.trim(),
      description: message,
      estimated_time: eta,
      updated_by: meta?.admin_profile_id ?? null,
      email_sent: !!body.send_email,
    })
    .select()
    .single()

  if (error?.code === '42P01') {
    return NextResponse.json(
      { error: 'Timeline table not found. Run DB migration to enable this feature.' },
      { status: 503 },
    )
  }
  if (error) return NextResponse.json({ error: 'Could not add the timeline update', detail: error.message }, { status: 500 })

  if (body.send_email) {
    // Mirror the note/ETA onto the order so the customer email includes them.
    // Best-effort: these columns may be absent on the drifted live table, and a
    // missing column must not fail the timeline update that already succeeded.
    const patch: Record<string, string> = {}
    if (message) patch.custom_message = message
    if (eta) patch.estimated_delivery = eta
    if (Object.keys(patch).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: pErr } = await (supabase as any).from('orders').update(patch).eq('id', id)
      if (pErr) console.warn('Timeline: could not mirror message/ETA onto order:', pErr.message)
    }
    const status = body.status.trim()
    // An admin-typed subject overrides the auto-generated email subject line.
    const subjectOverride = body.email_subject?.trim() || null
    after(() => notifyOrderEvent(id, status, { adminProfileId: meta?.admin_profile_id ?? null, subjectOverride, customMessage: message }))
  }

  return NextResponse.json(mapTimelineRow(data), { status: 201 })
}
