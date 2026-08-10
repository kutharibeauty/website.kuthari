import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { DEFAULT_REFERRAL_CONFIG, type ReferralConfig } from '@/lib/referral/config'
import ReferralsClient from './ReferralsClient'

export const metadata: Metadata = { title: 'Referrals | Kuthari Admin' }
export const revalidate = 0

export default async function ReferralsPage() {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cms } = await (supabase as any)
    .from('cms_content')
    .select('value')
    .eq('key', 'referral_config')
    .maybeSingle()

  const config: ReferralConfig = { ...DEFAULT_REFERRAL_CONFIG, ...(cms?.value ?? {}) }

  // Program stats.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: totalReferrals } = await (supabase as any)
    .from('referrals')
    .select('id', { count: 'exact', head: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rewardRows } = await (supabase as any)
    .from('referrals')
    .select('reward_amount')
  const totalRewards = ((rewardRows ?? []) as Array<{ reward_amount: number | null }>)
    .reduce((s, r) => s + Number(r.reward_amount ?? 0), 0)

  return (
    <ReferralsClient
      initialConfig={config}
      stats={{ totalReferrals: totalReferrals ?? 0, totalRewards }}
    />
  )
}
