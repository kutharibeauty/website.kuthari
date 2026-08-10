import { createAdminClient } from '@/lib/supabase/server'

/** Fallback when the admin hasn't set one (matches the Settings page default). */
export const DEFAULT_OTP_EXPIRY_MINUTES = 10
/**
 * Message Central caps OTP validity — its default is 60 seconds and it applies a
 * gateway maximum. Keep the setting within 1–15 min; sendOtp sends this × 60 as
 * the gateway's `otpExpiry` (seconds) and logs if the gateway shortens it.
 */
const MIN_MINUTES = 1
const MAX_MINUTES = 15

/**
 * How long an OTP stays valid, from Admin → Settings (cms_content 'settings').
 *
 * This setting existed in the UI but was never read by the OTP code — the
 * expiry was hardcoded — so changing it in the admin panel did nothing.
 */
export async function getOtpExpiryMinutes(): Promise<number> {
  try {
    const db = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from('cms_content')
      .select('value')
      .eq('key', 'settings')
      .maybeSingle()
    const v = (data?.value ?? null) as { otp_expiry_minutes?: unknown } | null
    const n = Number(v?.otp_expiry_minutes)
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_OTP_EXPIRY_MINUTES
    return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(n)))
  } catch {
    return DEFAULT_OTP_EXPIRY_MINUTES
  }
}
