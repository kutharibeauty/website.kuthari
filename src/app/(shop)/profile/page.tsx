import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import ProfileForm from './ProfileForm'
import ReferralCard from '@/components/account/ReferralCard'
import { getReferralConfig, referralBenefitText } from '@/lib/referral/config'

export const metadata: Metadata = {
  title: 'My Profile — Kuthari Beauty Store',
  description: 'Manage your Kuthari Beauty Store account details, saved delivery addresses and language preferences.',
  robots: { index: false },
}

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('name, phone, email, referral_code, referral_redemptions_used')
    .eq('id', userId)
    .maybeSingle()

  const referralCfg = await getReferralConfig()

  // Count-based referrer reward: how many people used this customer's code, and
  // how many of those uses they still have to spend at their own checkout.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: referralsMade } = await (supabase as any)
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
  const referralsCount = referralsMade ?? 0
  const usesLeft = Math.max(0, referralsCount - Number(profile?.referral_redemptions_used ?? 0))

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero strip ── */}
      <div className="relative overflow-hidden bg-primary border-b-2 border-primary mb-6">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
        <div className="relative z-10 px-4 max-w-4xl mx-auto py-7 md:py-9">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors mb-2"
          >
            <ArrowLeft size={12} strokeWidth={2.5} /> Back to Shop
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            My Profile
          </h1>
          <p className="text-xs text-white/45 font-medium mt-0.5">
            Manage your account settings
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">
        {referralCfg.enabled && (
          <ReferralCard
            code={(profile?.referral_code as string | null) ?? null}
            referralsCount={referralsCount}
            usesLeft={usesLeft}
            benefit={referralBenefitText(referralCfg)}
          />
        )}
        <ProfileForm
          initialName={profile?.name ?? ''}
          initialEmail={profile?.email ?? ''}
          phone={profile?.phone ?? ''}
        />
      </div>
    </div>
  )
}
