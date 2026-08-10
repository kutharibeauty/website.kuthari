import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

// Delivery is all-India, so lookups are NOT geographically scoped. The local
// `ganjam_post_offices` table (migration 028) is kept only as a fast local
// cache for the home district; anything it doesn't cover falls through to
// India Post's national directory.
const PIN_RE = /^\d{6}$/

export interface LookupOption {
  area: string
  pincode: string
  city: string | null
  state: string
  /** "Head Office (H.O.)" / "Sub Office (S.O.)" / "Branch Office (B.O.)" — shown
   *  in the dropdown because the same place name repeats across offices. */
  office_type?: string | null
}

/** "Berhampur Division" → "Berhampur"; India Post's division doubles as the city. */
const cityFromDivision = (division: string | null | undefined) =>
  (division ?? '').replace(/\s*Division\s*$/i, '').trim() || null

/** Head Office first, then Sub, then Branch — most significant office leads. */
const typeRank = (t: string | null | undefined) =>
  /head/i.test(t ?? '') ? 0 : /sub/i.test(t ?? '') ? 1 : 2

type Row = {
  pincode: string
  area_name: string
  office_type: string | null
  division: string | null
}

const toOption = (r: Row): LookupOption => ({
  area: r.area_name,
  pincode: r.pincode,
  city: cityFromDivision(r.division),
  state: 'Odisha',
  office_type: r.office_type,
})

// ── India Post's public API ──────────────────────────────────────────────────
// Serves every pincode outside the locally cached home district, and covers the
// case where the local directory table isn't reachable at all.
interface Office { Name?: string; District?: string; Division?: string; State?: string; Pincode?: string }

async function postal(path: string): Promise<Office[] | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(`https://api.postalpincode.in/${path}`, { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ Status?: string; PostOffice?: Office[] }>
    const entry = Array.isArray(data) ? data[0] : null
    if (entry?.Status !== 'Success') return []
    return entry.PostOffice ?? []
  } catch {
    return null
  }
}

/**
 * GET /api/pincodes/lookup — admin-gated, covers all of India.
 *
 *   ?pincode=760003 → { found, inArea, area, city, state, areas, options }
 *       `options` lists EVERY area that pincode covers (one pincode here covers
 *       up to 19), so the admin confirms which label they mean instead of
 *       silently getting the first.
 *
 *   ?area=nuagam    → { found, options: [...] }
 *       Substring match, so "nuagam" finds "Gosaninuagam B.O". Place names
 *       repeat across the district, so each option carries its pincode and
 *       office type to disambiguate.
 *
 * Served from our own copy of the India Post directory for the home district
 * (migration 028), falling back to India Post's national API for the rest.
 */
export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params = req.nextUrl.searchParams
  const pincode = (params.get('pincode') ?? '').trim()
  const area = (params.get('area') ?? '').trim()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  /**
   * True when the local directory table exists but holds nothing — i.e.
   * migration 028 ran without its seed. Only used to keep the log/flow honest;
   * either way an unmatched pincode falls through to India Post.
   */
  let emptyCache: boolean | null = null
  const directoryIsEmpty = async (): Promise<boolean> => {
    if (emptyCache !== null) return emptyCache
    const { data, error } = await db.from('ganjam_post_offices').select('id').limit(1)
    emptyCache = !error && Array.isArray(data) && data.length === 0
    return emptyCache
  }

  // ── Pincode → every area it covers ──
  if (pincode) {
    if (!PIN_RE.test(pincode)) return NextResponse.json({ error: 'Invalid pincode' }, { status: 400 })

    const { data, error } = await db
      .from('ganjam_post_offices')
      .select('pincode, area_name, office_type, division')
      .eq('pincode', pincode)
      .limit(30)

    // A hit in the local cache answers immediately; anything else (including
    // zero rows, since we now serve every pincode) falls through to India Post.
    if (!error && data && data.length > 0) {
      const options = (data as Row[])
        .sort((a, b) => typeRank(a.office_type) - typeRank(b.office_type) || a.area_name.localeCompare(b.area_name))
        .map(toOption)
      const first = options[0]
      return NextResponse.json({
        found: true,
        inArea: true,
        area: first.area,
        city: first.city,
        state: first.state,
        areas: options.map((o) => o.area),
        options,
      })
    }

    // Not in the local cache — ask India Post, nationally.
    await directoryIsEmpty() // keeps the half-applied-migration signal observable
    const offices = await postal(`pincode/${pincode}`)
    if (!offices || offices.length === 0) return NextResponse.json({ found: false })
    const options: LookupOption[] = offices.map((o) => ({
      area: o.Name ?? '',
      pincode: o.Pincode ?? pincode,
      city: o.Division || o.District || null,
      state: o.State ?? '',
    }))
    return NextResponse.json({
      found: true,
      inArea: true,
      area: options[0].area,
      city: options[0].city,
      state: options[0].state,
      areas: options.map((o) => o.area),
      options,
    })
  }

  // ── Area name → matching places ──
  if (area) {
    if (area.length < 2) return NextResponse.json({ found: false, options: [] })

    // Escape LIKE wildcards so a typed % or _ is matched literally.
    const term = area.replace(/[\\%_]/g, (m) => `\\${m}`)

    const { data, error } = await db
      .from('ganjam_post_offices')
      .select('pincode, area_name, office_type, division')
      .ilike('area_name', `%${term}%`)
      .limit(40)

    if (!error && data && data.length > 0) {
      const lower = area.toLowerCase()
      const options = (data as Row[])
        // Names that START with what was typed are the likelier intent, so they
        // lead; the rest stay available below rather than being cut.
        .sort((a, b) => {
          const ap = a.area_name.toLowerCase().startsWith(lower) ? 0 : 1
          const bp = b.area_name.toLowerCase().startsWith(lower) ? 0 : 1
          return ap - bp || a.area_name.localeCompare(b.area_name)
        })
        .slice(0, 15)
        .map(toOption)
      return NextResponse.json({ found: options.length > 0, options })
    }

    // Not in the local cache — ask India Post, nationally (needs a near-exact name).
    if (area.length < 3) return NextResponse.json({ found: false, options: [] })
    const offices = await postal(`postoffice/${encodeURIComponent(area)}`)
    if (!offices) return NextResponse.json({ found: false, options: [] })
    const seen = new Set<string>()
    const options: LookupOption[] = []
    for (const o of offices) {
      const key = `${o.Name}|${o.Pincode}`
      if (seen.has(key) || !o.Pincode) continue
      seen.add(key)
      options.push({ area: o.Name ?? '', pincode: o.Pincode, city: o.Division || o.District || null, state: o.State ?? '' })
    }
    return NextResponse.json({ found: options.length > 0, options: options.slice(0, 15) })
  }

  return NextResponse.json({ error: 'Provide a pincode or area' }, { status: 400 })
}
