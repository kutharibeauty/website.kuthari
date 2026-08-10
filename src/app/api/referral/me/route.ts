import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { getReferralConfig, referralBenefitText } from '@/lib/referral/config'

/**
 * GET /api/referral/me — the signed-in customer's referral status: their code
 * (if they have one yet), accrued reward credit, the program benefit blurb, and
 * whether they're still eligible to redeem someone else's code (new customers,
 * first order only).
 */
export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? userId

  const db = createAdminClient()
  const cfg = await getReferralConfig()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (db as any)
    .from('profiles')
    .select('referral_code, referral_redemptions_used')
    .eq('id', profileId)
    .maybeSingle()

  // Eligible to be a referee only with zero prior orders and no existing referral.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: priorOrders } = await (db as any)
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingReferral } = await (db as any)
    .from('referrals')
    .select('id')
    .eq('referee_id', profileId)
    .maybeSingle()

  // Referrer reward is count-based: how many people used my code, minus how many
  // of those uses I've already spent = uses still available.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: referralsMade } = await (db as any)
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', profileId)
  const redemptionsUsed = Math.max(0, Number(profile?.referral_redemptions_used ?? 0))
  const referralsCount = referralsMade ?? 0
  const usesLeft = Math.max(0, referralsCount - redemptionsUsed)

  return NextResponse.json({
    enabled: cfg.enabled,
    code: (profile?.referral_code as string | null) ?? null,
    benefit: referralBenefitText(cfg),
    eligibleForReferee: cfg.enabled && (priorOrders ?? 0) === 0 && !existingReferral,
    // Count-based referrer reward.
    referralsCount,
    usesLeft,
    // The per-use discount shape, so the checkout can apply one use (the server
    // recomputes it authoritatively at order time).
    referrerReward: usesLeft > 0
      ? { type: cfg.referrer_type, value: cfg.referrer_value, max: cfg.max_discount }
      : null,
  })
}
