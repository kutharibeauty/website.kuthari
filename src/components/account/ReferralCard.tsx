'use client'

import { useState } from 'react'
import { Gift, Copy, Check, Share2 } from 'lucide-react'

interface Props {
  code: string | null
  /** How many people have ordered with this customer's code. */
  referralsCount: number
  /** Referrer-discount uses still available (referralsCount − uses already spent). */
  usesLeft: number
  benefit: string
}

/**
 * Account-section referral card: shows the customer's own code (copy + share),
 * the program benefit, how many people used their code, and how many referrer
 * discount uses they have left to spend at their own checkout.
 */
export default function ReferralCard({ code, referralsCount, usesLeft, benefit }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable */ }
  }

  const share = async () => {
    if (!code) return
    const text = `Use my Kuthari Beauty Store referral code ${code} on your first order to get a discount! ${benefit}.`
    try {
      if (navigator.share) await navigator.share({ title: 'Kuthari Beauty Store Referral', text })
      else await navigator.clipboard.writeText(text)
    } catch { /* cancelled */ }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-primary bg-primary p-5 text-white">
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Gift size={16} className="text-white/80" />
          <h3 className="font-black text-sm uppercase tracking-widest">Refer &amp; Earn</h3>
        </div>
        <p className="text-xs font-medium text-white/60 mb-4">{benefit} · Share your code with friends.</p>

        {code ? (
          <>
            <div className="flex items-stretch gap-2">
              <div className="flex-1 min-w-0 rounded-xl bg-white/10 border-2 border-white/20 px-4 py-3 flex items-center">
                <span className="font-black text-lg tracking-[0.2em] truncate">{code}</span>
              </div>
              <button onClick={copy} className="shrink-0 w-12 rounded-xl bg-white text-primary flex items-center justify-center hover:bg-white/90 transition-colors active:scale-95" aria-label="Copy code">
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
              <button onClick={share} className="shrink-0 w-12 rounded-xl bg-white/15 border-2 border-white/20 text-white flex items-center justify-center hover:bg-white/25 transition-colors active:scale-95" aria-label="Share code">
                <Share2 size={18} />
              </button>
            </div>
            {referralsCount > 0 && (
              <div className="mt-3 flex flex-col gap-1 rounded-xl bg-white/10 border border-white/15 px-3 py-2.5">
                <span className="text-sm font-bold text-white/90">
                  <b className="font-black">{referralsCount}</b> {referralsCount === 1 ? 'person has' : 'people have'} used your code.
                </span>
                <span className="text-xs font-medium text-white/70">
                  {usesLeft > 0
                    ? `Your referral discount will apply on your next ${usesLeft} order${usesLeft === 1 ? '' : 's'}.`
                    : 'No referral discount uses left — share your code again to earn more.'}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm font-bold text-white/80 rounded-xl bg-white/10 border border-white/15 px-4 py-3">
            Place your first order to unlock your personal referral code.
          </p>
        )}
      </div>
    </section>
  )
}
