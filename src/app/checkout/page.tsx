import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { AuthMetadata } from '@/types'
import CheckoutClient from './CheckoutClient'

export const metadata: Metadata = {
  title: 'Checkout — Kuthari Beauty Store',
  description: 'Securely complete your Kuthari Beauty Store order with online payment and fast delivery across India.',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/login?next=/checkout')

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? ''

  if (!profileId) redirect('/')

  // Pre-fill the email so returning customers don't re-type it.
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any).from('profiles').select('email').eq('id', profileId).maybeSingle()
  const rawEmail = (profile?.email as string | null) ?? ''
  // Ignore the internal placeholder emails created for phone-only signups.
  const initialEmail = /@kutharibeauty\.internal$/i.test(rawEmail) ? '' : rawEmail

  return <CheckoutClient profileId={profileId} initialEmail={initialEmail} />
}
