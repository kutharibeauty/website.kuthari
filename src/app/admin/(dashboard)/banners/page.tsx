import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import BannersClient from './BannersClient'
import type { Banner, CmsContent } from '@/types/database.types'

export const metadata: Metadata = { title: 'Banners & CMS | Kuthari Admin' }
export const revalidate = 0

export default async function BannersPage() {
  const supabase = createAdminClient()

  const [bannersRes, cmsRes] = await Promise.all([
    supabase.from('banners').select('*').order('display_order'),
    supabase.from('cms_content').select('*'),
  ])

  return (
    <BannersClient
      initialBanners={(bannersRes.data ?? []) as Banner[]}
      cmsContent={(cmsRes.data ?? []) as CmsContent[]}
    />
  )
}
