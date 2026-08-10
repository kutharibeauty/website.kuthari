import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { getReferralConfig } from '@/lib/referral/config'

/**
 * GET /api/referral/validate?code=XYZ — check a referral code for the signed-in
 * customer at checkout. Returns whether it's redeemable and the taker discount
 * shape so the cart can preview it. The order route re-validates authoritatively.
 */
export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id ?? userId

  const code = (req.nextUrl.searchParams.get('code') ?? '').trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false, message: 'Enter a referral code.' })

  const cfg = await getReferralConfig()
  if (!cfg.enabled) return NextResponse.json({ valid: false, message: 'Referrals are not active right now.' })

  const db = createAdminClient()

  // Must belong to a real, different customer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: referrer } = await (db as any)
    .from('profiles')
    .select('id, referral_code')
    .eq('referral_code', code)
    .maybeSingle()
  if (!referrer) return NextResponse.json({ valid: false, message: 'Invalid referral code.' })
  if (referrer.id === profileId) return NextResponse.json({ valid: false, message: 'You cannot use your own referral code.' })

  // Referee eligibility: new customer (no prior orders), not already referred.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: priorOrders } = await (db as any)
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId)
  if ((priorOrders ?? 0) > 0) {
    return NextResponse.json({ valid: false, message: 'Referral codes can only be used on your first order.' })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingReferral } = await (db as any)
    .from('referrals')
    .select('id')
    .eq('referee_id', profileId)
    .maybeSingle()
  if (existingReferral) {
    return NextResponse.json({ valid: false, message: 'You have already used a referral code.' })
  }

  return NextResponse.json({
    valid: true,
    code: referrer.referral_code,
    referee_type: cfg.referee_type,
    referee_value: cfg.referee_value,
    min_order_value: cfg.min_order_value,
    max_discount: cfg.max_discount,
    message: 'Referral code applied!',
  })
}
