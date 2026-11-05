import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Zap, Package, Truck } from 'lucide-react'
import PhoneAuthForm from '@/components/auth/PhoneAuthForm'
import LoginImageMarquee from '@/components/auth/LoginImageMarquee'
import Logo, { BrandLockup } from '@/components/layout/Logo'

export const metadata: Metadata = {
  title: 'Login / Sign Up — KUTHARI BEAUTY STORE',
  description:
    'Log in or create your Kuthari Beauty Store account to order cosmetics, skincare, haircare and salon products — retail or bulk. Manage orders and track deliveries.',
  // TODO(Phase 2): replace with real cosmetics/salon SEO keywords.
  keywords: [
    'Kuthari Beauty Store login',
    'Kuthari Beauty Store account',
    'cosmetics store account',
    'bulk order login',
    'beauty store signup',
    'Kuthari Beauty Store sign up',
  ],
  alternates: { canonical: '/login' },
}

const PERKS = [
  { icon: Package, label: 'Retail or bulk', sub: 'One piece, or a full box' },
  { icon: Truck, label: 'Sent across India', sub: 'Packed at our Brahmapur shop' },
  { icon: ShieldCheck, label: 'Secure payment', sub: 'Pay online with Razorpay' },
  { icon: Zap, label: 'Track every order', sub: 'From packed to delivered' },
]

export default function LoginPage() {
  return (
    <main className="h-[100dvh] lg:h-auto lg:min-h-screen flex bg-background overflow-hidden lg:overflow-x-hidden ">

      {/* ── LEFT — Branded panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[52%] flex-col relative overflow-hidden bg-primary">

        <div className="relative z-10 p-10 pb-0">
          <Link href="/" className="inline-flex rounded-xl bg-paper-raised px-4 py-3" aria-label="Kuthari Beauty Store, home">
            <BrandLockup size="md" />
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 xl:px-14">
          <div className="mb-8">
            <h1 className="display text-paper-raised text-[clamp(3rem,2rem+3vw,5.5rem)]">The beauty counter,</h1>
            <p className="accent-line text-periwinkle text-[clamp(2.5rem,1.7rem+2.4vw,4.5rem)] mb-6">at your door.</p>
            <p className="text-[17px] text-paper-raised/80 leading-relaxed max-w-sm">
              Sign in to shop single pieces or full boxes and follow every order to your door.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {PERKS.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors duration-300"
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon size={16} className="text-white/70" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-paper-raised leading-tight">{label}</p>
                  <p className="text-[13px] text-paper-raised/70 mt-1">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 px-10 py-6">
          <p className="text-[13px] text-paper-raised/70">© 2026 Kuthari Beauty Store, Brahmapur</p>
        </div>
      </div>

      {/* ── RIGHT — Phone OTP sign-in ── */}
      <div className="flex-1 min-w-0 flex flex-col items-center justify-start lg:justify-center relative h-full lg:h-auto lg:px-5 lg:py-12">
        {/* Mobile — Blinkit-style animated product wall at the top */}
        <div className="lg:hidden w-full max-w-full overflow-hidden shrink-0">
          <LoginImageMarquee />
        </div>

        <div className="w-full max-w-full flex-1 min-h-0 flex flex-col items-center justify-center px-5 pb-4 lg:flex-none lg:justify-start lg:px-0 lg:pb-0">
          <div className="lg:hidden mb-5 text-center">
            <Link href="/" className="inline-flex">
              <Logo className="h-12 w-auto" />
            </Link>
            <p className="text-[13px] text-muted mt-1">Retail and bulk, sent across India</p>
          </div>

          <Suspense fallback={null}>
            <PhoneAuthForm
              portal="customer"
              allowSignup
              title="Welcome back"
              subtitle="Sign in or create an account with your mobile number"
            />
          </Suspense>

          <div className="mt-4 lg:mt-6">
            <Link
              href="/"
              className="text-[11px] font-black text-on-surface-variant/50 hover:text-primary transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
