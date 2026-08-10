import { auth } from '@/lib/auth/server'
import { aiJSON, isAIConfigured } from '@/lib/ai/openrouter'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!isAIConfigured()) {
    return NextResponse.json({ error: 'AI is not configured. Add OPENROUTER_API_KEY to the environment.' }, { status: 503 })
  }

  const { name, description, category, price, unit } = await req.json() as {
    name: string
    description?: string
    category?: string
    price?: number
    unit?: string
  }

  if (!name) return NextResponse.json({ error: 'Product name required' }, { status: 400 })

  const priceStr = price != null && unit ? `₹${price} per ${unit}` : price != null ? `₹${price}` : 'Not specified'
  const plainDesc = description ? description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400) : 'N/A'

  const system = 'You are an SEO expert for KUTHARI BEAUTY STORE, a B2B wholesale distributor in India that sells cosmetics, skincare, haircare, salon and grooming products to retailers in bulk. You always reply with strict JSON only.'

  const user = `Generate SEO metadata for this product listing.
- Product name: ${name}
- Category: ${category ?? 'General'}
- Price: ${priceStr}
- Description: ${plainDesc}

Rules:
- Write for B2B buyers searching for wholesale prices in Odisha/India.
- meta_title: <= 60 characters, must include the product name.
- meta_description: <= 160 characters, must mention "wholesale" or "bulk" and include a call to action.
- keywords: exactly 10 specific, high-intent wholesale keywords (no brand fluff).

Return ONLY this JSON, no markdown, no commentary:
{"meta_title":"...","meta_description":"...","keywords":["...","..."]}`

  try {
    const json = await aiJSON<{ meta_title?: string; meta_description?: string; keywords?: string[] }>({
      system, user, maxTokens: 600, temperature: 0.5,
    })
    return NextResponse.json({
      meta_title: (json.meta_title ?? '').slice(0, 60),
      meta_description: (json.meta_description ?? '').slice(0, 160),
      keywords: Array.isArray(json.keywords) ? json.keywords.map(String).slice(0, 10) : [],
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'SEO generation failed' }, { status: 502 })
  }
}
