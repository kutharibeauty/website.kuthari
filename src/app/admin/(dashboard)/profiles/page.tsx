import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import ProfilesClient from './ProfilesClient'
import type { AdminProfile } from '@/types/admin.types'

export const metadata: Metadata = { title: 'Admin Profiles | Kuthari Admin' }
export const revalidate = 0

export default async function ProfilesPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('admin_profiles')
    .select('*')
    .order('created_at', { ascending: true })

  return <ProfilesClient initialProfiles={(data ?? []) as unknown as AdminProfile[]} />
}
