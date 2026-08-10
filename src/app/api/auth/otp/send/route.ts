import { NextResponse } from 'next/server'
import { sendOtp } from '@/lib/message-central'
import { recordOtpSend } from '@/lib/auth/otp-store'
import { getOtpExpiryMinutes } from '@/lib/settings/otp'
import { normalizeIndianPhone } from '@/lib/validators'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const phoneDigits = normalizeIndianPhone(body?.phone)
    if (!phoneDigits) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit Indian mobile number.' }, { status: 400 })
    }

    const ip = getClientIp(request)

    const perPhoneHour = await rateLimit({ key: `otp:send:phone:hour:${phoneDigits}`, limit: 5, windowSec: 3600 })
    if (!perPhoneHour.ok) return rateLimitResponse(perPhoneHour)
    const perIpHour = await rateLimit({ key: `otp:send:ip:hour:${ip}`, limit: 30, windowSec: 3600 })
    if (!perIpHour.ok) return rateLimitResponse(perIpHour)

    // OTP validity is admin-configurable (Settings → OTP expiry). Both the SMS
    // gateway and our own binding below must use the SAME value, or whichever is
    // shorter silently wins.
    const expiryMinutes = await getOtpExpiryMinutes()
    const result = await sendOtp(phoneDigits, expiryMinutes)

    if (result.success && result.verificationId) {
      await rateLimit({ key: `otp:send:phone:short:${phoneDigits}`, limit: 1, windowSec: 30 }).catch(() => {})

      try {
        await recordOtpSend(result.verificationId, phoneDigits, expiryMinutes)
      } catch (err) {
        console.error('[OTP Send] Failed to record OTP binding — refusing send:', err)
        return NextResponse.json(
          {
            error: 'Could not initialise verification. Please try again.',
            hint: 'otp_verifications table may be missing. Run supabase/migrations/006_supabase_native_auth.sql against the database.',
          },
          { status: 500 },
        )
      }

      return NextResponse.json({ success: true, verificationId: result.verificationId, message: 'OTP sent successfully' })
    }

    const upstream = result.message || 'Unknown upstream error'
    console.error('[OTP Send] Message Central rejected send:', upstream)

    const lower = upstream.toLowerCase()
    const operatorHint =
      lower.includes('not configured')
        ? 'MESSAGE_CENTRAL_CUSTOMER_ID and either MESSAGE_CENTRAL_AUTH_TOKEN or MESSAGE_CENTRAL_PASSWORD are missing. Add them to .env.local and restart.'
        : lower.includes('token') || lower.includes('unauthor') || lower.includes('401')
        ? 'Message Central auth failed. Check MESSAGE_CENTRAL_CUSTOMER_ID and MESSAGE_CENTRAL_AUTH_TOKEN / MESSAGE_CENTRAL_PASSWORD are correct.'
        : lower.includes('balance') || lower.includes('credit') || lower.includes('quota')
        ? 'Message Central account is out of SMS credits. Top up the account.'
        : null

    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.', reason: upstream, ...(operatorHint ? { hint: operatorHint } : {}) },
      { status: 400 },
    )
  } catch (error) {
    console.error('[OTP Send Route] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
