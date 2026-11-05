import { NextRequest, NextResponse, after } from 'next/server'
import { nanoid } from 'nanoid'
import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'
import type { OrderItem } from '@/types/database.types'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sniffImageType, uploadImage } from '@/lib/media'
import {
  ISSUE_REASONS, ISSUE_RESOLUTIONS, MAX_ISSUE_PHOTOS, issueWindowLeft,
  type IssueItem, type IssueReason, type IssueResolution,
} from '@/lib/orders/issues'
import { notifyIssue } from '@/lib/orders/issue-notify'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

/**
 * POST /api/orders/[id]/issue — the customer reports a damaged, faulty, wrong,
 * missing or expired item on a delivered order (multipart form).
 *
 * Fields: reason, resolution (replacement | exchange), description,
 * items (JSON: [{ index, quantity }] — positions in order.items), photos (1–5 images).
 * The shop replaces or exchanges; no money is refunded.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id
  if (!profileId) return NextResponse.json({ error: 'Profile not configured' }, { status: 400 })

  const rl = await rateLimit({ key: `issue:user:${profileId}`, limit: 6, windowSec: 3600 })
  if (!rl.ok) return rateLimitResponse(rl)

  const { id } = await params
  const db = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (db as any)
    .from('orders')
    .select('id, status, items, delivered_at, updated_at')
    .eq('id', id)
    .eq('user_id', profileId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'delivered') {
    return NextResponse.json({ error: 'You can report a problem once the order has been delivered.' }, { status: 409 })
  }
  if (issueWindowLeft(order) <= 0) {
    return NextResponse.json({ error: 'The time to report a problem with this order has passed. Please call or WhatsApp us.' }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any).from('order_issues').select('id').eq('order_id', id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'You have already reported a problem with this order.' }, { status: 409 })

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'Invalid form' }, { status: 400 }) }

  const reason = String(form.get('reason') ?? '') as IssueReason
  const resolution = String(form.get('resolution') ?? 'replacement') as IssueResolution
  const description = String(form.get('description') ?? '').trim().slice(0, 1000)
  if (!(reason in ISSUE_REASONS)) return NextResponse.json({ error: 'Choose what went wrong.' }, { status: 400 })
  if (!(resolution in ISSUE_RESOLUTIONS)) return NextResponse.json({ error: 'Choose replacement or exchange.' }, { status: 400 })

  // Items: positions in the order, with a quantity no larger than was ordered.
  const orderItems = (order.items ?? []) as OrderItem[]
  let picked: Array<{ index: number; quantity: number }>
  try { picked = JSON.parse(String(form.get('items') ?? '[]')) } catch { picked = [] }
  const items: IssueItem[] = []
  const seen = new Set<number>()
  for (const p of Array.isArray(picked) ? picked : []) {
    const i = Number(p?.index)
    const it = orderItems[i]
    if (!it || seen.has(i)) continue
    seen.add(i)
    const q = Math.max(1, Math.min(Math.floor(Number(p?.quantity) || 1), Number(it.quantity) || 1))
    items.push({ product_id: String(it.product_id), name: it.name, unit: it.unit ?? null, quantity: q, image: it.image ?? null })
  }
  if (!items.length) return NextResponse.json({ error: 'Pick the item or items with the problem.' }, { status: 400 })

  // Photos: required, except for a missing item (there may be nothing to photograph).
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > MAX_ISSUE_PHOTOS) return NextResponse.json({ error: `Add up to ${MAX_ISSUE_PHOTOS} photos.` }, { status: 400 })
  if (!files.length && reason !== 'missing_item') {
    return NextResponse.json({ error: 'Add at least one photo of the item and its packaging.' }, { status: 400 })
  }
  const prepared: Array<{ buf: Buffer; ext: string; mime: string }> = []
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'Each photo must be 5 MB or smaller.' }, { status: 400 })
    const buf = Buffer.from(await f.arrayBuffer())
    const t = sniffImageType(buf)
    if (!t) return NextResponse.json({ error: 'Photos must be JPEG, PNG, WebP or HEIC images.' }, { status: 400 })
    prepared.push({ buf, ...t })
  }

  let photos: string[]
  try {
    photos = await Promise.all(prepared.map((p) => uploadImage(`${nanoid(16)}.${p.ext}`, p.buf, p.mime, 'claims')))
  } catch (e) {
    console.error('[issue] photo upload failed:', e)
    return NextResponse.json({ error: 'Could not upload your photos. Please try again.' }, { status: 502 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issue, error } = await (db as any)
    .from('order_issues')
    .insert({ order_id: id, user_id: profileId, reason, resolution, description: description || null, items, photos })
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'You have already reported a problem with this order.' }, { status: 409 })
    console.error('[issue] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 500 })
  }

  after(() => notifyIssue(issue.id))
  return NextResponse.json({ ok: true, issue })
}
