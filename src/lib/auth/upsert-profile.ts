import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProfileFields {
  id: string
  phone: string
  name?: string
  email?: string | null
}

/**
 * Resilient upsert into `profiles`, tolerant of a missing optional column so
 * a signup can never be silently orphaned.
 */
export async function upsertProfile(
  admin: SupabaseClient,
  fields: ProfileFields,
): Promise<string | null> {
  const core = { id: fields.id, phone: fields.phone }

  const full: Record<string, unknown> = { ...core }
  if (fields.name !== undefined) full.name = fields.name
  if (fields.email !== undefined) full.email = fields.email

  const first = await admin.from('profiles').upsert(full, { onConflict: 'id' })
  if (!first.error) return null

  console.error('[upsertProfile] full upsert failed, retrying core-only:', first.error.message)

  const retry = await admin.from('profiles').upsert(core, { onConflict: 'id' })
  if (!retry.error) return null

  console.error('[upsertProfile] core upsert failed:', retry.error.message)
  return retry.error.message
}
