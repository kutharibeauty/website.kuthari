import { auth } from '@/lib/auth/server'
import { isAIConfigured } from '@/lib/ai/openrouter'
import { writeSeo } from '@/lib/ai/product-copy'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { requirePermission } from '@/lib/auth/guard'

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

  const { name, description, category, price, unit } = await req.json() as {
    name: string
    description?: string
    category?: string
    price?: number
    unit?: string
  }

  if (!name) return NextResponse.json({ error: 'Product name required' }, { status: 400 })

  try {
    const out = await writeSeo({ name, description, category, price, unit })
    return NextResponse.json(out)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'SEO generation failed' }, { status: 502 })
  }
}
