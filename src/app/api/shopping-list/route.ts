import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'

type ListItem = { id: string; text: string; done: boolean }

async function getProfileId(): Promise<string | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return null
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  return meta?.supabase_profile_id ?? null
}

// Sanitize + cap the incoming items so a client can't store anything huge/unsafe.
function cleanItems(raw: unknown): ListItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 200)
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>
      const text = typeof o.text === 'string' ? o.text.trim().slice(0, 200) : ''
      return {
        id: typeof o.id === 'string' ? o.id.slice(0, 40) : Math.random().toString(36).slice(2, 10),
        text,
        done: o.done === true,
      }
    })
    .filter((it) => it.text.length > 0)
}

export async function GET() {
  const profileId = await getProfileId()
  if (!profileId) return Response.json({ items: [] })
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).from('shopping_lists').select('items').eq('user_id', profileId).maybeSingle()
  if (error) return Response.json({ items: [] }) // table may not exist yet (pre-migration)
  return Response.json({ items: (data?.items ?? []) as ListItem[] })
}

export async function PUT(request: Request) {
  const profileId = await getProfileId()
  if (!profileId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const items = cleanItems((body as { items?: unknown }).items)
  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('shopping_lists')
    .upsert({ user_id: profileId, items, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return Response.json({ error: 'Could not save' }, { status: 500 })
  return Response.json({ ok: true })
}
