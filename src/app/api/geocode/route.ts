import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/geocode?lat=..&lon=..  →  { pincode, city, state, area }
 *
 * Server-side reverse geocoding for the "Use my current location" delivery
 * check. Runs server-side so we avoid CORS, can set the identifying User-Agent
 * Nominatim requires, and can fall back across providers — BigDataCloud's free
 * client endpoint frequently returns an empty postcode for India, which is why
 * the pincode wasn't coming through.
 */

interface GeoResult {
  pincode: string | null
  city: string | null
  state: string | null
  area: string | null
}

const PIN_RE = /^\d{6}$/

function pick(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) if (v && String(v).trim()) return String(v).trim()
  return null
}

async function fetchJSON(url: string, headers?: Record<string, string>): Promise<unknown | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(url, { headers, signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ── Provider 1: OpenStreetMap Nominatim (best Indian postcode coverage) ──
async function viaNominatim(lat: string, lon: string): Promise<GeoResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
  const data = (await fetchJSON(url, {
    'User-Agent': 'KuthariBeautyStore/1.0 (smortika@gmail.com)',
    'Accept-Language': 'en',
  })) as { address?: Record<string, string> } | null
  const a = data?.address
  if (!a) return null
  return {
    pincode: (a.postcode ?? '').replace(/\D/g, '').slice(0, 6) || null,
    city: pick(a.city, a.town, a.village, a.municipality, a.county),
    state: pick(a.state),
    area: pick(a.suburb, a.neighbourhood, a.residential, a.road),
  }
}

// ── Provider 2: BigDataCloud (free client endpoint) ──
async function viaBigDataCloud(lat: string, lon: string): Promise<GeoResult | null> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
  const data = (await fetchJSON(url)) as
    | { postcode?: string; city?: string; locality?: string; principalSubdivision?: string }
    | null
  if (!data) return null
  return {
    pincode: (data.postcode ?? '').replace(/\D/g, '').slice(0, 6) || null,
    city: pick(data.city, data.locality),
    state: pick(data.principalSubdivision),
    area: pick(data.locality),
  }
}

// ── Provider 3: Photon (Komoot / OSM) ──
async function viaPhoton(lat: string, lon: string): Promise<GeoResult | null> {
  const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`
  const data = (await fetchJSON(url)) as { features?: { properties?: Record<string, string> }[] } | null
  const p = data?.features?.[0]?.properties
  if (!p) return null
  return {
    pincode: (p.postcode ?? '').replace(/\D/g, '').slice(0, 6) || null,
    city: pick(p.city, p.district, p.county),
    state: pick(p.state),
    area: pick(p.name, p.street),
  }
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lon = req.nextUrl.searchParams.get('lon')

  if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
  }

  const providers = [viaNominatim, viaBigDataCloud, viaPhoton]
  let best: GeoResult = { pincode: null, city: null, state: null, area: null }

  // Try each in turn; stop as soon as we have a valid 6-digit pincode, but keep
  // the best city/state we've seen so the response is still useful without one.
  for (const provider of providers) {
    const r = await provider(lat, lon)
    if (!r) continue
    best = {
      pincode: best.pincode ?? (r.pincode && PIN_RE.test(r.pincode) ? r.pincode : null),
      city: best.city ?? r.city,
      state: best.state ?? r.state,
      area: best.area ?? r.area,
    }
    if (best.pincode) break
  }

  return NextResponse.json(best, { headers: { 'Cache-Control': 'private, max-age=3600' } })
}
