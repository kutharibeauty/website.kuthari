/**
 * Pre-check before sending an OTP.
 *   - LOGIN (any portal): the phone must already have an account in the
 *     right place (profiles for customer, admin_profiles for admin/delivery)
 *     — otherwise we bounce the client to sign-up / "contact admin" instead
 *     of wasting an SMS.
 *   - SIGNUP (customer only): passes through; /verify handles dedup.
 */
import { NextResponse } from 'next/server'
import { normalizeIndianPhone } from '@/lib/validators'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'

type Portal = 'customer' | 'admin' | 'delivery'

export async function POST(request: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const digits = normalizeIndianPhone(body?.phone)
  if (!digits) {
    return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 })
  }

  const ip = getClientIp(request)
  const rl = await rateLimit({ key: `precheck:ip:${ip}`, limit: 60, windowSec: 3600 })
  if (!rl.ok) return rateLimitResponse(rl)

  const mode: string = body?.mode
  const portal: Portal = ['customer', 'admin', 'delivery'].includes(body?.portal) ? body.portal : 'customer'

  if (portal !== 'customer' && mode === 'signup') {
    return NextResponse.json({ error: 'Self sign-up is not available for this portal.' }, { status: 403 })
  }

  if (mode === 'signup' && portal === 'customer') {
    const admin = createAdminClient()
    const cleanPhone = `+91${digits}`

    try {
      // Already a customer → tell them to log in instead of re-registering.
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .or(`phone.eq.${cleanPhone},phone.eq.${digits}`)
        .maybeSingle()

      if (profile) {
        return NextResponse.json(
          { error: 'This number is already registered. Please log in instead.', error_code: 'already_registered' },
          { status: 409 },
        )
      }

      // Registered as staff → wrong portal for a customer sign-up.
      const { data: staff } = await admin
        .from('admin_profiles')
        .select('id')
        .or(`phone.eq.${cleanPhone},phone.eq.${digits}`)
        .maybeSingle()

      if (staff) {
        return NextResponse.json(
          { error: 'This number is registered as staff. Please use the staff login.', error_code: 'wrong_portal' },
          { status: 400 },
        )
      }
    } catch (err) {
      console.error('[otp/precheck] signup DB check failed:', err)
      // fail open — /verify performs the authoritative dedup check
    }
  }

  if (mode === 'login') {
    const admin = createAdminClient()
    const cleanPhone = `+91${digits}`

    try {
      if (portal === 'customer') {
        const { data: profile } = await admin
          .from('profiles')
          .select('id')
          .or(`phone.eq.${cleanPhone},phone.eq.${digits}`)
          .maybeSingle()

        if (!profile) {
          return NextResponse.json(
            { error: 'No account found for this number. Please create an account first.', error_code: 'user_not_found' },
            { status: 404 },
          )
        }
      } else {
        const expectedRoles = portal === 'admin' ? ['admin', 'super_admin'] : ['delivery']
        const { data: staff } = await admin
          .from('admin_profiles')
          .select('id, role, is_active')
          .or(`phone.eq.${cleanPhone},phone.eq.${digits}`)
          .maybeSingle()

        if (!staff || !staff.is_active || !expectedRoles.includes(staff.role)) {
          return NextResponse.json(
            { error: 'No staff account found for this number. Contact your administrator.', error_code: 'user_not_found' },
            { status: 404 },
          )
        }
      }
    } catch (err) {
      console.error('[otp/precheck] DB check failed:', err)
      // fail open — /verify performs the authoritative check
    }
  }

  return NextResponse.json({ success: true })
}
