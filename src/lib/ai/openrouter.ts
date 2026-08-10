/**
 * Thin server-side OpenRouter client for admin content generation.
 *
 * OpenRouter is OpenAI-compatible. The API key + model live in env (.env.local
 * locally, project env vars in prod) and must NEVER reach the browser — every
 * caller here is a server route handler.
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

// Free models are frequently rate-limited/exhausted, so we try a chain: the
// configured model(s) first, then these known-good free fallbacks. The request
// succeeds as soon as any one of them returns text.
// Instruct models first — they return clean JSON. Reasoning models (nemotron)
// are last resort: they burn the token budget "thinking" and often truncate
// structured output, so we only fall back to them if every instruct model is busy.
const FALLBACK_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
]

function modelChain(): string[] {
  const configured = (process.env.OPENROUTER_MODEL ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean)
  return [...new Set([...configured, ...FALLBACK_MODELS])]
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

/** Raw chat call — tries each model in the chain until one returns text. */
export async function aiChat({ system, user, maxTokens = 900, temperature = 0.6 }: ChatOpts): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('AI is not configured. Set OPENROUTER_API_KEY in your environment.')

  let lastError = 'no model responded'

  for (const model of modelChain()) {
    let res: Response
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.kutharibeauty.com',
          'X-Title': 'Kuthari Beauty Store Admin',
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      })
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
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
    if (apiError) { lastError = apiError; continue }
    if (!res.ok) { lastError = `HTTP ${res.status}`; continue }

    const raw = data?.choices?.[0]?.message?.content
    // Some reasoning models prepend a <think>…</think> block — strip it.
    const text = typeof raw === 'string' ? raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() : ''
    if (text) return text

    lastError = `empty response from ${model}`
  }

  throw new Error(`AI is busy right now — free models are rate-limited (${lastError.slice(0, 110)}). Please try again in a moment.`)
}

/** Chat call that expects a JSON object back; tolerant of code fences / prose. */
export async function aiJSON<T>(opts: ChatOpts): Promise<T> {
  const text = await aiChat(opts)
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI did not return valid JSON. Please try again.')
  try {
    return JSON.parse(match[0]) as T
  } catch {
    throw new Error('Could not parse the AI response. Please try again.')
  }
}
