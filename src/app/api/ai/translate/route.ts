import { auth } from '@/lib/auth/server'
import { aiJSON, isAIConfigured } from '@/lib/ai/openrouter'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'

/**
 * POST /api/ai/translate — translate a map of English fields into Odia.
 * Body: { fields: { name: "Atta", description: "<p>…</p>", … } }
 * →     { translations: { name: "ଅଟା", description: "<p>…</p>", … } }
 * HTML tags, numbers, prices, units and brand names are preserved.
 */
export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!isAIConfigured()) {
    return NextResponse.json({ error: 'AI is not configured.' }, { status: 503 })
  }

  const { fields } = await req.json() as { fields?: Record<string, unknown> }
  const entries = Object.entries(fields ?? {}).filter(
    ([, v]) => typeof v === 'string' && (v as string).trim(),
  ) as [string, string][]
  if (entries.length === 0) return NextResponse.json({ translations: {} })

  const system =
    'You are a professional English→Odia (ଓଡ଼ିଆ) translator for an Indian wholesale grocery e-commerce site. ' +
    'EVERY value you return MUST be written in Odia script — never leave English/Latin letters in the output. ' +
    'Translate ordinary words normally. For brand names and proper nouns (Everest, Amul, Fortune, Tata, etc.) ' +
    'TRANSLITERATE them phonetically into Odia script — do NOT keep them in English. ' +
    'Keep HTML tags/attributes, numbers, prices and units (kg, L, g, ml) exactly as they are. ' +
    'Examples: "Everest Masala" → "ଏଭରେଷ୍ଟ ମସଲା"; "Edible Oil" → "ଭୋଜ୍ୟ ତେଲ"; "Amul Butter 200gm" → "ଅମୁଲ ବଟର ୨୦୦gm". ' +
    'Reply with strict JSON only.'

  const user =
    `Translate each field's value from English into Odia SCRIPT (ଓଡ଼ିଆ). The output must NOT contain any English letters — transliterate brand names into Odia. ` +
    `Return ONLY a JSON object with the SAME keys and the Odia value for each:\n${JSON.stringify(Object.fromEntries(entries))}`

  try {
    const translations = await aiJSON<Record<string, string>>({
      system, user, maxTokens: 1800, temperature: 0.3,
    })
    // A weak/busy model sometimes echoes the English back verbatim. If nothing
    // came back in Odia script, treat it as a failure instead of writing English
    // into the Odia field — so the admin can retry (and hit a better model).
    const ODIA = /[଀-୿]/
    const anyOdia = Object.values(translations ?? {}).some(
      (v) => typeof v === 'string' && ODIA.test(v),
    )
    if (!anyOdia) {
      return NextResponse.json(
        { error: 'The translation came back in English — the AI is busy right now. Please try again in a moment.' },
        { status: 502 },
      )
    }
    return NextResponse.json({ translations })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Translation failed' }, { status: 502 })
  }
}
