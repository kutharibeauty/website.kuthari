import { auth } from '@/lib/auth/server'
import { isAIConfigured } from '@/lib/ai/openrouter'
import { writeDescription } from '@/lib/ai/product-copy'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { requirePermission } from '@/lib/auth/guard'

/**
 * POST /api/products/generate-description
 * Body: { name, category?, price?, unit?, brand?, prompt? }
 * → { description: <html EN>, description_or: <html Odia> }
 */
// Free AI models can be slow; allow up to five minutes.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const noPerm = await requirePermission('manage_products'); if (noPerm) return noPerm
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

  try {
    const out = await writeDescription({ name, brand, category, price, unit }, prompt)
    return NextResponse.json(out)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Description generation failed' }, { status: 502 })
  }
}
