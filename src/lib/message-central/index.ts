/**
 * Message Central integration — transactional SMS + phone-OTP verification.
 *
 * Required env vars:
 *   MESSAGE_CENTRAL_CUSTOMER_ID — Customer ID from the MC dashboard
 *   MESSAGE_CENTRAL_AUTH_TOKEN  — Static long-lived token from the MC dashboard
 *                                 (preferred — used directly, no extra request)
 *   MESSAGE_CENTRAL_PASSWORD    — Fallback only, used to fetch a token
 *                                 dynamically if AUTH_TOKEN isn't set
 *   MESSAGE_CENTRAL_SENDER_ID   — Registered SMS sender id (default: BCRTRD)
 *   MESSAGE_CENTRAL_BASE_URL    — API base (default: https://cpaas.messagecentral.com)
 */

const DEFAULT_BASE_URL = 'https://cpaas.messagecentral.com'

function baseUrl(): string {
  return process.env.MESSAGE_CENTRAL_BASE_URL || DEFAULT_BASE_URL
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function fetchDynamicAuthToken(): Promise<string | null> {
  const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID
  const password = process.env.MESSAGE_CENTRAL_PASSWORD

  if (!customerId || !password) {
    console.error('[Message Central] Missing MESSAGE_CENTRAL_CUSTOMER_ID or MESSAGE_CENTRAL_PASSWORD (and no static MESSAGE_CENTRAL_AUTH_TOKEN set).')
    return null
  }

  const key = Buffer.from(password, 'utf-8').toString('base64')
  const url = `${baseUrl()}/auth/v1/authentication/token?customerId=${encodeURIComponent(customerId)}&key=${encodeURIComponent(key)}&scope=NEW&country=91`

  try {
    const res = await fetch(url, { method: 'GET' })
    const text = await res.text()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      console.error('[Message Central] Auth token response was not JSON:', text.slice(0, 200))
      return null
    }

    const token: string | undefined = data?.token ?? data?.data?.token ?? data?.authToken
    if (!token) {
      console.error('[Message Central] Auth token missing from response:', JSON.stringify(data).slice(0, 300))
      return null
    }

    // MC tokens are long-lived (~24h); cache for slightly less to be safe.
    cachedToken = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 }
    return token
  } catch (err) {
    console.error('[Message Central] Auth token fetch failed:', err)
    return null
  }
}

async function getAuthToken(forceRefresh = false): Promise<string | null> {
  // A static dashboard-issued token, if configured, is always preferred —
  // no network round-trip, no expiry bookkeeping.
  const staticToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN
  if (staticToken) return staticToken

  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }
  return fetchDynamicAuthToken()
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')
}

/**
 * Fire-and-forget transactional SMS (e.g. delivery OTP messages).
 */
export async function sendSms(phone: string, message: string): Promise<void> {
  const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID
  const senderId = process.env.MESSAGE_CENTRAL_SENDER_ID ?? 'BCRTRD'
  if (!customerId) return

  const token = await getAuthToken()
  if (!token) return

  const mobile = digitsOnly(phone)
  const url = new URL(`${baseUrl()}/sms/v3/send`)
  url.searchParams.set('customerId', customerId)
  url.searchParams.set('countryCode', '91')
  url.searchParams.set('mobileNumber', mobile)
  url.searchParams.set('message', message)
  url.searchParams.set('senderId', senderId)
  url.searchParams.set('type', 'SMS')

  await fetch(url.toString(), {
    method: 'POST',
    headers: { authToken: token },
  }).catch(() => {}) // fire-and-forget; don't fail the caller on SMS error
}

/**
 * Send a phone-verification OTP. Returns a verificationId to pass to verifyOtp.
 */
export async function sendOtp(
  phone: string,
  /** OTP validity in MINUTES. Comes from Admin → Settings. */
  expiryMinutes = 10,
): Promise<{
  success: boolean
  verificationId?: string
  message?: string
  /** The validity the gateway actually applied, in seconds (from its response). */
  timeoutSeconds?: number
}> {
  const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID
  if (!customerId) return { success: false, message: 'OTP service not configured.' }

  let token = await getAuthToken()
  if (!token) return { success: false, message: 'OTP service not configured.' }

  // Message Central's `otpExpiry` is in SECONDS. The previous code sent it in
  // MINUTES (1–60), so the gateway read that as 1–60 SECONDS and every OTP died
  // in about a minute regardless of the admin's setting — exactly the "expires
  // in 1–2 min" report. Convert minutes → seconds, and clamp to the gateway's
  // accepted window (1–15 min).
  const requestedSeconds = Math.min(900, Math.max(60, (Math.round(expiryMinutes) || 10) * 60))

  const mobile = digitsOnly(phone)
  const doSend = async (authToken: string) => {
    const url = `${baseUrl()}/verification/v3/send?countryCode=91&customerId=${encodeURIComponent(customerId)}&flowType=SMS&mobileNumber=${mobile}&otpLength=4&otpExpiry=${requestedSeconds}`
    return fetch(url, { method: 'POST', headers: { authToken, 'Content-Type': 'application/json' } })
  }

  try {
    let res = await doSend(token)
    if (res.status === 401) {
      // Cached token may have expired early — refresh once and retry.
      token = await getAuthToken(true)
      if (!token) return { success: false, message: 'OTP service not configured.' }
      res = await doSend(token)
    }

    const text = await res.text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return { success: false, message: `MC service error: ${text.slice(0, 100)}` }
    }

    if (data?.responseCode === 200 && data?.data?.verificationId) {
      // The gateway echoes the validity it applied as `timeout` (seconds). Log
      // when it doesn't match what we asked for, so a plan-level cap on OTP
      // validity is visible instead of silently shortening every code.
      const applied = Number(data?.data?.timeout)
      if (Number.isFinite(applied)) {
        if (Math.abs(applied - requestedSeconds) > 2) {
          console.warn(`[Message Central] otpExpiry not honoured: requested ${requestedSeconds}s, gateway applied ${applied}s. The MC account/plan may cap OTP validity — raise it in the MC dashboard.`)
        } else {
          console.log(`[Message Central] OTP sent, validity ${applied}s.`)
        }
      }
      return {
        success: true,
        verificationId: String(data.data.verificationId),
        timeoutSeconds: Number.isFinite(applied) ? applied : undefined,
      }
    }
    return { success: false, message: data?.message || `OTP failed (code: ${data?.responseCode})` }
  } catch (err) {
    console.error('[Message Central] sendOtp error:', err)
    return { success: false, message: 'OTP service error.' }
  }
}

/**
 * Verify a previously-sent OTP.
 */
export async function verifyOtp(
  verificationId: string,
  otp: string,
): Promise<{ success: boolean; message?: string }> {
  const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID
  if (!customerId) return { success: false, message: 'OTP service not configured.' }

  let token = await getAuthToken()
  if (!token) return { success: false, message: 'OTP service not configured.' }

  const doVerify = async (authToken: string) => {
    const url = `${baseUrl()}/verification/v3/validateOtp?customerId=${encodeURIComponent(customerId)}&code=${encodeURIComponent(otp)}&verificationId=${encodeURIComponent(verificationId)}`
    return fetch(url, { method: 'GET', headers: { authToken } })
  }

  try {
    let res = await doVerify(token)
    if (res.status === 401) {
      token = await getAuthToken(true)
      if (!token) return { success: false, message: 'OTP service not configured.' }
      res = await doVerify(token)
    }

    const text = await res.text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return { success: false, message: `Verify service error: ${text.slice(0, 100)}` }
    }

    if (data?.responseCode === 200 && data?.data?.verificationStatus === 'VERIFICATION_COMPLETED') {
      return { success: true }
    }
    return { success: false, message: data?.message || 'Invalid or expired OTP.' }
  } catch (err) {
    console.error('[Message Central] verifyOtp error:', err)
    return { success: false, message: 'OTP verification error.' }
  }
}
