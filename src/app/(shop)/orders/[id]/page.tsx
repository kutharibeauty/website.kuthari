import type { Metadata } from 'next'
import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { AuthMetadata } from '@/types'
import type { Order } from '@/types/database.types'
import OrderDetailClient from './OrderDetailClient'
import type { OrderIssue } from '@/lib/orders/issues'

// Private, per-customer page — noindex, but a clean title/description for tabs & shares.
export const metadata: Metadata = {
  title: 'Order Details — Kuthari Beauty Store',
  description: 'View your Kuthari Beauty Store order — items, delivery status, payment and invoice.',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string }>
}

export default async function OrderDetailPage({ params, searchParams }: PageProps) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/login')

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id
  if (!profileId) redirect('/login')

  const { id } = await params
  const { new: isNew } = await searchParams

  // `orders` is service-role-only — read via the admin client, scoped to the
  // signed-in user's profileId so it can only ever return their own order.
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', profileId)
    .maybeSingle()

  if (error || !data) notFound()

  // A damaged / wrong item request on this order, if the customer made one.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issue } = await (supabase as any).from('order_issues').select('*').eq('order_id', id).maybeSingle()

  // Referral code to celebrate on a brand-new order (generated at checkout).
  const { getReferralConfig, referralBenefitText } = await import('@/lib/referral/config')
  const referralCfg = await getReferralConfig()
  let referralCode: string | null = null
  if (referralCfg.enabled && isNew === '1') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prof } = await (supabase as any)
      .from('profiles').select('referral_code').eq('id', profileId).maybeSingle()
    referralCode = (prof?.referral_code as string | null) ?? null
  }

  return (
    <OrderDetailClient
      order={data as unknown as Order}
      isNew={isNew === '1'}
      issue={(issue ?? null) as OrderIssue | null}
      referralCode={referralCode}
      referralBenefit={referralCfg.enabled ? referralBenefitText(referralCfg) : null}
    />
  )
}
