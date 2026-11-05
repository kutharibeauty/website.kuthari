import { SITE_URL } from '@/lib/site-url'
/**
 * Thin server-side OpenRouter client for admin content generation.
 *
 * OpenRouter is OpenAI-compatible. The API key + model live in env (.env.local
 * locally, project env vars in prod) and must NEVER reach the browser — every
 * caller here is a server route handler.
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

// Free models are often rate-limited, so we try a chain and stop at the first
// one that returns text: OPENROUTER_MODEL (comma-separated) if set, else the
// shop's chosen NVIDIA Nemotron models, then a few other free fallbacks.
// Fastest first: Super VL with reasoning off answers in seconds; Ultra is the
// strongest but slow.
const DEFAULT_MODELS = [
  'nvidia/nemotron-3.5-super-vl:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3.5-lightning:free',
]

/**
 * Nemotron models "think" before answering, and on the free tier that thinking
 * can use the whole token budget and leave an empty reply. Tested Nov 2026:
 *  - Super VL / Lightning: thinking switched off gives full answers fast.
 *  - Ultra: thinking can't be switched off, but capping it at 512 tokens works.
 *  - Other models: no setting sent.
 */
function reasoningFor(model: string): Record<string, unknown> | undefined {
  if (!model.includes('nemotron')) return undefined
  if (model.includes('ultra')) return { max_tokens: 512, exclude: true }
  return { enabled: false }
}
// Other free models that were live on OpenRouter in November 2026. Models leave
// the free tier without notice; one that answers "unavailable for free" is
// skipped and the next is tried.
const FALLBACK_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
]

function modelChain(): string[] {
  const configured = (process.env.OPENROUTER_MODEL ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean)
  return [...new Set([...(configured.length ? configured : DEFAULT_MODELS), ...FALLBACK_MODELS])]
}

export function isAIConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY
}

interface ChatOpts {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
}

/** Short model name for messages: "nvidia/nemotron-3.5-super-vl:free" → "nemotron-3.5-super-vl". */
const short = (m: string) => (m.split('/').pop() ?? m).replace(/:free$/, '')

/**
 * Raw chat call: tries each model in the chain until one returns usable text.
 * `accept` lets a caller reject an answer (e.g. not valid JSON) so the next
 * model gets a turn.
 */
export async function aiChat(
  { system, user, maxTokens = 900, temperature = 0.6 }: ChatOpts,
  accept: (text: string) => boolean = () => true,
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('AI is not configured. Set OPENROUTER_API_KEY in your environment.')

  const failures: string[] = []
  let dailyCapHit = false

  for (const model of modelChain()) {
    const fail = (why: string) => { failures.push(`${short(model)}: ${why}`) }
    let res: Response
    try {
      res = await fetch(ENDPOINT, {
        // Generation is slow but must not hang the admin request forever.
        signal: AbortSignal.timeout(60000),
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': SITE_URL,
          'X-Title': 'Kuthari Beauty Store Admin',
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          ...(reasoningFor(model) ? { reasoning: reasoningFor(model) } : {}),
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      })
    } catch (e) {
      fail(e instanceof Error && e.name === 'TimeoutError' ? 'too slow' : 'no connection')
      continue
    }

    // An auth failure won't be fixed by trying another model.
    if (res.status === 401 || res.status === 403) {
      throw new Error('AI key is invalid or unauthorized. Check OPENROUTER_API_KEY.')
    }

    // OpenRouter can return an upstream error INSIDE a 200 body — check both.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json().catch(() => null)) as any
    const apiError: string | undefined = data?.error?.message
    if (apiError || !res.ok) {
      const msg = (apiError ?? `HTTP ${res.status}`).toLowerCase()
      if (msg.includes('free-models-per-day') || msg.includes('per day')) dailyCapHit = true
      fail(msg.includes('unavailable for free') ? 'no longer free' : res.status === 429 || msg.includes('rate') ? 'busy' : 'error')
      continue
    }

    const raw = data?.choices?.[0]?.message?.content
    // Some reasoning models prepend a <think>…</think> block — strip it.
    const text = typeof raw === 'string' ? raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() : ''
    if (!text) { fail('empty reply'); continue }
    if (!accept(text)) { fail('unusable reply'); continue }
    return text
  }

  if (dailyCapHit) {
    throw new Error("Today's free AI limit on OpenRouter is used up. It resets tomorrow; adding $10 credit at openrouter.ai raises it to 1,000 a day.")
  }
  throw new Error(`All AI models are busy right now (${failures.join(', ')}). Please try again in a minute.`)
}

/** Pull the JSON object out of a reply (tolerates code fences and prose). */
function parseJsonObject<T>(text: string): T | null {
  const match = text.replace(/```json/gi, '').replace(/```/g, '').match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) as T } catch { return null }
}

/** Chat call that expects a JSON object back; a model that answers with broken JSON is skipped. */
export async function aiJSON<T>(opts: ChatOpts): Promise<T> {
  const text = await aiChat(opts, (t) => parseJsonObject<T>(t) !== null)
  return parseJsonObject<T>(text) as T
}
