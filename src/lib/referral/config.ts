import { createAdminClient } from '@/lib/supabase/server'
import { DEFAULT_REFERRAL_CONFIG, type ReferralConfig } from './shared'

// Re-export the pure helpers/types so existing server-side imports from this
// module keep working. Client components must import from './shared' directly
// (this file pulls in the server-only Supabase client → next/headers).
export {
  DEFAULT_REFERRAL_CONFIG,
  computeRefereeDiscount,
  computeReferrerReward,
  referralBenefitText,
} from './shared'
export type { ReferralConfig, DiscountType } from './shared'

const CMS_KEY = 'referral_config'

/** Read the admin-configured referral program settings from cms_content. */
export async function getReferralConfig(): Promise<ReferralConfig> {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('cms_content')
      .select('value')
      .eq('key', CMS_KEY)
      .maybeSingle()
    const v = (data?.value ?? null) as Partial<ReferralConfig> | null
    if (!v) return DEFAULT_REFERRAL_CONFIG
    return { ...DEFAULT_REFERRAL_CONFIG, ...v }
  } catch {
    return DEFAULT_REFERRAL_CONFIG
  }
}
