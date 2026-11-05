import { NextRequest, NextResponse, after } from 'next/server'
import { revalidateTag } from 'next/cache'
import { auth } from '@/lib/auth/server'
import { requirePermission } from '@/lib/auth/guard'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'
import { notifyIssue } from '@/lib/orders/issue-notify'

/** What each action needs the request to be in, and what it becomes. */
const STEPS = {
  approve: { from: 'requested', to: 'approved' },
  reject: { from: 'requested', to: 'rejected' },
  resolve: { from: 'approved', to: 'resolved' },
} as const

/**
 * PATCH /api/order-issues/[id] — staff decision on a damaged / wrong item request.
 * Body: { action: 'approve' | 'reject' | 'resolve', note?: string }.
 * Rejecting needs a note (the customer is told why). No money is refunded.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const noPerm = await requirePermission('update_order_status'); if (noPerm) return noPerm
  const { sessionClaims } = await auth()
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined

  let body: { action?: keyof typeof STEPS; note?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  const step = body.action ? STEPS[body.action] : undefined
  if (!step) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  const note = (body.note ?? '').trim().slice(0, 1000)
  if (body.action === 'reject' && !note) {
    return NextResponse.json({ error: 'Say why it is not approved. The customer will see this.' }, { status: 400 })
  }

  const { id } = await params
  const db = createAdminClient()

  let reviewer: string | null = null
  if (meta?.admin_profile_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: me } = await (db as any).from('admin_profiles').select('name').eq('id', meta.admin_profile_id).maybeSingle()
    reviewer = me?.name ?? null
  }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status: step.to, updated_at: now }
  if (note) patch.admin_note = note
  if (body.action === 'resolve') patch.resolved_at = now
  else { patch.reviewed_at = now; patch.reviewed_by = reviewer }

  // Conditional on the current status, so two staff clicking at once can't
  // both act (the second matches no row).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (db as any)
    .from('order_issues')
    .update(patch)
    .eq('id', id)
    .eq('status', step.from)
    .select('*')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not update the request' }, { status: 500 })
  if (!updated) return NextResponse.json({ error: 'This request has already been handled. Refresh to see it.' }, { status: 409 })

  revalidateTag('admin-badges', { expire: 0 })
  after(() => notifyIssue(id))
  return NextResponse.json({ ok: true, issue: updated })
}
