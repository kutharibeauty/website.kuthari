import { auth } from '@/lib/auth/server'
import { aiJSON, isAIConfigured } from '@/lib/ai/openrouter'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

/**
 * POST /api/products/generate-description
 * Body: { name, category?, price?, unit?, brand?, prompt? }
 * → { description: <html EN>, description_or: <html Odia> }
 */
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

  const { name, category, price, unit, brand, prompt } = await req.json() as {
    name: string
    category?: string
    price?: number
    unit?: string
    brand?: string
    prompt?: string
  }

  if (!name) return NextResponse.json({ error: 'Product name required' }, { status: 400 })

  const facts = [
    `Product: ${name}`,
    brand ? `Brand: ${brand}` : null,
    category ? `Category: ${category}` : null,
    price != null ? `Price: ₹${price}${unit ? ` per ${unit}` : ''}` : null,
    unit ? `Unit / pack: ${unit}` : null,
  ].filter(Boolean).join('\n')

  const system = 'You are a product copywriter for KUTHARI BEAUTY STORE, a B2B wholesale distributor of cosmetics, skincare, haircare, salon and grooming products in India. You write clear, trustworthy descriptions for retailers buying in bulk. You always reply with strict JSON only.'

  const user = `Write a compelling product description for this wholesale listing.

${facts}
${prompt ? `\nExtra instructions from the admin: ${prompt}` : ''}

Requirements:
- English version: 60-110 words. Focus on quality, bulk/wholesale value, use-cases for retailers, and reliability. Do NOT invent specific certifications, weights or prices that were not provided.
- Odia version: a faithful natural translation of the English version into Odia (ଓଡ଼ିଆ) script.
- Format BOTH as simple, clean HTML using only these tags: <p>, <ul>, <li>, <strong>. No headings, no inline styles, no markdown.

Return ONLY this JSON, no commentary:
{"description":"<p>...English HTML...</p>","description_or":"<p>...Odia HTML...</p>"}`

  try {
    const json = await aiJSON<{ description?: string; description_or?: string }>({
      system, user, maxTokens: 1500, temperature: 0.7,
    })
    if (!json.description) {
      return NextResponse.json({ error: 'AI did not return a description. Please try again.' }, { status: 502 })
    }
    return NextResponse.json({
      description: json.description,
      description_or: json.description_or ?? '',
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Description generation failed' }, { status: 502 })
  }
}
