import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'
import type { Address } from '@/types/database.types'
import AddressesClient from './AddressesClient'

export const metadata: Metadata = {
  title: 'Saved Addresses — Kuthari Beauty Store',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function AddressesPage() {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/login?next=/addresses')

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? userId

  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from('addresses')
    .select('*')
    .eq('user_id', profileId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return <AddressesClient profileId={profileId} initialAddresses={(data ?? []) as Address[]} />
}
