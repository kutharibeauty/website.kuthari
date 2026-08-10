import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Zap, Package, Truck } from 'lucide-react'
import PhoneAuthForm from '@/components/auth/PhoneAuthForm'
import LoginImageMarquee from '@/components/auth/LoginImageMarquee'
import Logo from '@/components/layout/Logo'

export const metadata: Metadata = {
  title: 'Login / Sign Up — KUTHARI BEAUTY STORE Wholesale Account',
  description:
    'Log in or create your Kuthari Beauty Store account to order wholesale cosmetics, skincare, haircare and salon supplies in bulk. Manage orders, track deliveries and shop at wholesale prices.',
  // TODO(Phase 2): replace with real cosmetics/salon SEO keywords.
  keywords: [
    'Kuthari Beauty Store login',
    'Kuthari Beauty Store account',
    'wholesale cosmetics account',
    'bulk order login',
    'wholesale salon supplies distributor signup',
    'Kuthari Beauty Store sign up',
  ],
  alternates: { canonical: '/login' },
}

const PERKS = [
  { icon: Package, label: 'Bulk Wholesale', sub: 'Best prices on large orders' },
  { icon: Truck, label: 'Fast Dispatch', sub: 'Next-day delivery across Odisha' },
  { icon: ShieldCheck, label: 'Secure Orders', sub: '100% secure online payment' },
  { icon: Zap, label: '500+ Retailers', sub: 'Trusted by businesses statewide' },
]

export default function LoginPage() {
  return (
    <main className="h-[100dvh] lg:h-auto lg:min-h-screen flex bg-background overflow-hidden lg:overflow-x-hidden selection:bg-primary selection:text-white">

      {/* ── LEFT — Branded panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[52%] flex-col relative overflow-hidden bg-primary">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-96 h-96 bg-white/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 p-10 pb-0">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <Logo className="h-16 w-auto group-hover:opacity-80 transition-opacity duration-300" />
            <span className="font-heading font-black text-white text-xl tracking-tight leading-none">
              KUTHARI<br />
              <span className="font-sans font-bold text-[10px] tracking-[0.3em] text-white/50 uppercase">Beauty Store</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 xl:px-14">
          <div className="mb-8">
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 border border-white/15 px-3 py-1.5 rounded-full mb-6">
              Wholesale Platform
            </span>
            <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.08] mb-4">
              Odisha&apos;s Most
              <br />
              Trusted Wholesale
              <br />
              <span className="text-white/50">Distributor.</span>
            </h1>
            <p className="text-sm text-white/50 font-medium leading-relaxed max-w-sm">
              Sign in to access your wholesale account, track bulk orders, and manage your business deliveries — all in one place.
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
                  <p className="text-[12px] font-black text-white uppercase tracking-wide leading-none">{label}</p>
                  <p className="text-[11px] text-white/40 font-medium mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 px-10 py-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">
            © 2026 Kuthari Beauty Store · Brahmapur, Ganjam, Odisha
          </p>
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
            <p className="text-xs text-on-surface-variant font-medium mt-1 tracking-wide">
              Kuthari Beauty Store · Wholesale · Odisha
            </p>
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
              className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 hover:text-primary transition-colors duration-200"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
