import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import AdminProfileForm from '@/components/admin/AdminProfileForm'
import type { AdminProfile } from '@/types/admin.types'

export const metadata: Metadata = { title: 'Edit Admin Profile | Kuthari Admin' }

export default async function EditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('admin_profiles').select('*').eq('id', id).single()
  if (error || !data) notFound()

  const profile = data as unknown as AdminProfile

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-16 z-30 bg-surface border-b border-outline-variant/30 px-margin-mobile md:px-margin-desktop py-4 flex items-center gap-3">
        <Link
          href="/admin/profiles"
          className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary leading-tight">{profile.name}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant capitalize">
            {profile.role.replace('_', ' ')} · {profile.phone}
          </p>
        </div>
      </div>
      <div className="p-margin-mobile md:p-margin-desktop">
        <AdminProfileForm profile={profile} />
      </div>
    </div>
  )
}
