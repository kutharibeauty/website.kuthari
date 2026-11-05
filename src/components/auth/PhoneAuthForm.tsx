'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ChevronLeft, ShieldCheck, Phone, User, Mail, ArrowRight, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import OtpInput from './OtpInput'

type Portal = 'customer' | 'admin' | 'delivery'

interface Props {
  portal: Portal
  allowSignup: boolean
  title: string
  subtitle: string
}

export default function PhoneAuthForm({ portal, allowSignup, title, subtitle }: Props) {
  const searchParams = useSearchParams()
  const modeParam = searchParams.get('mode')

  const [mode, setMode] = useState<'login' | 'signup'>(allowSignup && modeParam === 'signup' ? 'signup' : 'login')
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [loginUrl, setLoginUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [notRegistered, setNotRegistered] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [otpShakeSignal, setOtpShakeSignal] = useState(0)
  const [verified, setVerified] = useState(false)

  const digits = phone.replace(/\D/g, '')

  // Sign-up mode gets its own copy; login keeps the portal-supplied title/subtitle.
  const heading = allowSignup && mode === 'signup' ? 'Create your account' : title
  const subheading =
    allowSignup && mode === 'signup'
      ? 'Register with your mobile number to get started'
      : subtitle

  // Auto-fetch the SMS OTP via the Web OTP API (Android Chrome, HTTPS only).
  // Progressive enhancement — silently no-ops where unsupported.
  useEffect(() => {
    if (step !== 'otp') return
    if (typeof window === 'undefined' || !('OTPCredential' in window)) return
    const ac = new AbortController()
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: ac.signal } as unknown as CredentialRequestOptions)
      .then((cred) => {
        const code = (cred as { code?: string } | null)?.code
        if (code) setOtp(code.replace(/\D/g, '').slice(0, 4))
      })
      .catch(() => {})
    return () => ac.abort()
  }, [step])

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotRegistered(false)
    setAlreadyRegistered(false)

    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.')
      return
    }

    setLoading(true)
    try {
      const formattedPhone = `+91${digits}`

      const pre = await fetch('/api/auth/otp/precheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, mode, portal }),
      })
      const preData = await pre.json().catch(() => ({}))

      if (!pre.ok) {
        if (preData?.error_code === 'already_registered') {
          setAlreadyRegistered(true)
          setLoading(false)
          return
        }
        if (preData?.error_code === 'user_not_found') {
          // New user entering their number on login: drop them straight onto the
          // sign-up form (same page, name field appears) instead of showing a
          // "no account found" popup. Staff portals have no self sign-up, so they
          // still get the contact-admin notice.
          if (allowSignup) {
            setError(null)
            setMode('signup')
          } else {
            setNotRegistered(true)
          }
          setLoading(false)
          return
        }
        setError(preData.error || 'Something went wrong.')
        setLoading(false)
        return
      }

      const otpRes = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      })
      const otpData = await otpRes.json().catch(() => ({}))

      if (!otpRes.ok || !otpData.verificationId) {
        const detail = otpData.hint || otpData.reason
        const base = otpData.error || 'Failed to send OTP. Please try again.'
        setError(detail ? `${base} — ${detail}` : base)
        setLoading(false)
        return
      }

      setVerificationId(otpData.verificationId)
      setStep('otp')
      // Clear any digits already typed — this same handler backs "Resend OTP",
      // and the old code is now dead, so leaving it in the boxes would only
      // invite the customer to submit a code that can no longer work.
      setOtp('')
      setMessage(`OTP sent to +91 ${digits}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * "Resend OTP" — wipe the typed digits immediately, before the request goes
   * out. Clearing only after the response leaves the dead code sitting in the
   * boxes while the SMS is on its way (and keeps it there if the send fails).
   */
  function handleResend(e: React.MouseEvent<HTMLButtonElement>) {
    setOtp('')
    setError(null)
    void sendOtp(e as unknown as React.FormEvent)
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (otp.length !== 4) {
      setError('Please enter the 4-digit OTP.')
      setOtpShakeSignal((n) => n + 1)
      return
    }
    if (!verificationId) {
      setError('Session expired. Please request a new OTP.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `+91${digits}`,
          otp,
          verificationId,
          mode,
          portal,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || data.error) {
        if (data?.error_code === 'user_not_found') {
          setNotRegistered(true)
          setLoading(false)
          return
        }
        const extra = data.detail || data.hint
        setError((data.error || 'OTP verification failed. Please try again.') + (extra ? ` — ${extra}` : ''))
        setOtpShakeSignal((n) => n + 1)
        setLoading(false)
        return
      }

      setLoginUrl(data.loginUrl)

      if (data.needs_name) {
        setStep('name')
        setLoading(false)
        return
      }

      if (data.loginUrl) {
        // Show a brief success beat before handing off — the redirect still
        // fires the same way, just ~500ms later so the confirmation registers.
        setVerified(true)
        setTimeout(() => { window.location.href = data.loginUrl }, 550)
      }
    } catch (err) {
      setError('Something went wrong: ' + (err instanceof Error ? err.message : String(err)))
      setOtpShakeSignal((n) => n + 1)
      setLoading(false)
    }
  }

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!loginUrl) {
      setError('Session expired — please request a new OTP.')
      return
    }
    try {
      sessionStorage.setItem('kbs_pending_profile', JSON.stringify({ name: name.trim(), email: email.trim(), ts: Date.now() }))
    } catch {}
    window.location.href = loginUrl
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-5 lg:mb-8">
        <h1 className="text-2xl font-black tracking-tight text-primary">{heading}</h1>
        <p className="text-sm text-on-surface-variant font-medium mt-1.5">{subheading}</p>
      </div>

      {step === 'phone' && (
        <form onSubmit={sendOtp} className="flex flex-col gap-3.5 lg:gap-4">
          {allowSignup && (
            <div className="relative flex items-center p-1.5 rounded-2xl bg-surface-container-low border border-table-border/60 mb-1">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`relative z-10 flex-1 py-3 rounded-xl text-[15px] font-semibold transition-colors duration-200 ${mode === m ? 'text-white' : 'text-on-surface-variant hover:text-primary'}`}
                >
                  {mode === m && (
                    <motion.span
                      layoutId="authTabIndicator"
                      className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-sm shadow-primary/25"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {m === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="text-xs font-black text-on-surface-variant">Name</label>
              <div className="relative mt-1.5">
                <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" strokeWidth={2.5} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-table-border focus:border-primary bg-surface-card font-medium text-primary placeholder:text-on-surface-variant/40 outline-none transition duration-200 focus:shadow-[0_0_0_4px_rgba(27, 44, 61,0.06)]"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="text-xs font-black text-on-surface-variant">Email (optional)</label>
              <div className="relative mt-1.5">
                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" strokeWidth={2.5} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-table-border focus:border-primary bg-surface-card font-medium text-primary placeholder:text-on-surface-variant/40 outline-none transition duration-200 focus:shadow-[0_0_0_4px_rgba(27, 44, 61,0.06)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-black text-on-surface-variant">Mobile Number</label>
            <div className="flex items-center mt-1.5 rounded-2xl border-2 border-table-border focus-within:border-primary bg-surface-card transition duration-200 focus-within:shadow-[0_0_0_4px_rgba(27, 44, 61,0.06)] overflow-hidden">
              <span className="flex items-center gap-2 pl-4 pr-3 py-3.5 font-black text-primary border-r-2 border-table-border bg-surface-container-low/50">
                <Phone size={15} strokeWidth={2.5} /> +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={digits}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Your phone number"
                className="flex-1 py-3.5 px-4 bg-transparent font-medium text-primary placeholder:text-on-surface-variant/40 outline-none"
              />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="group mt-2 w-full py-4 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg transition duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Send OTP
                <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform duration-200" />
              </>
            )}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={verifyOtp} className="flex flex-col gap-3.5 lg:gap-4">
          <button
            type="button"
            onClick={() => { setStep('phone'); setOtp(''); setError(null) }}
            className="flex items-center gap-1 text-xs font-black text-on-surface-variant hover:text-primary transition-colors w-max"
          >
            <ChevronLeft size={14} /> Back
          </button>

          {message && (
            <p className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <ShieldCheck size={16} className="text-primary" /> {message}
            </p>
          )}

          <div>
            <label className="text-xs font-black text-on-surface-variant">Enter OTP</label>
            <div className="mt-2.5">
              <OtpInput
                value={otp}
                onChange={setOtp}
                length={4}
                autoFocus
                shakeSignal={otpShakeSignal}
                onComplete={() => { if (!loading) (document.getElementById('otp-verify-btn') as HTMLButtonElement)?.focus() }}
              />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-error">{error}</p>}

          <button
            id="otp-verify-btn"
            type="submit"
            disabled={loading}
            className="group w-full py-4 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg transition duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Verify &amp; Continue
                <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform duration-200" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="text-xs font-black text-on-surface-variant hover:text-primary transition-colors self-center"
          >
            Resend OTP
          </button>
        </form>
      )}

      {step === 'name' && (
        <form onSubmit={handleSaveName} className="flex flex-col gap-3.5 lg:gap-4">
          <p className="text-sm font-medium text-on-surface-variant">One last thing: what should we call you?</p>
          <div>
            <label className="text-xs font-black text-on-surface-variant">Name</label>
            <div className="relative mt-1.5">
              <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" strokeWidth={2.5} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                autoFocus
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-table-border focus:border-primary bg-surface-card font-medium text-primary placeholder:text-on-surface-variant/40 outline-none transition duration-200 focus:shadow-[0_0_0_4px_rgba(27, 44, 61,0.06)]"
              />
            </div>
          </div>
          {error && <p className="text-sm font-medium text-error">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="group w-full py-4 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg transition duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </form>
      )}

      {notRegistered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card rounded-2xl shadow-xl w-full max-w-sm p-6 border-2 border-table-border">
            <h3 className="font-black text-lg text-primary">
              {portal === 'customer' ? 'No account found' : 'No staff account found'}
            </h3>
            <p className="text-sm text-on-surface-variant font-medium mt-2">
              {portal === 'customer'
                ? "We couldn't find an account for this number. Switch to Sign Up to create one."
                : 'Contact your administrator to get provisioned for this portal.'}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setNotRegistered(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-table-border font-black text-xs text-on-surface-variant hover:border-primary/40 transition-colors"
              >
                Close
              </button>
              {allowSignup && (
                <button
                  onClick={() => { setNotRegistered(false); setMode('signup') }}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-black text-xs hover:bg-primary/90 transition-colors"
                >
                  Sign Up
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {alreadyRegistered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card rounded-2xl shadow-xl w-full max-w-sm p-6 border-2 border-table-border">
            <h3 className="font-black text-lg text-primary">You already have an account</h3>
            <p className="text-sm text-on-surface-variant font-medium mt-2">
              This number is already registered. Please log in instead — no need to sign up again.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAlreadyRegistered(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-table-border font-black text-xs text-on-surface-variant hover:border-primary/40 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setAlreadyRegistered(false); setError(null); setMode('login') }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-black text-xs hover:bg-primary/90 transition-colors"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {verified && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              className="w-20 h-20 rounded-full bg-success flex items-center justify-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 18 }}
              >
                <Check size={36} strokeWidth={3.5} className="text-on-success" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
