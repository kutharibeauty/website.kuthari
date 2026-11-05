import Image from 'next/image'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * "Pay securely with": the UPI apps customers trust, shown where they decide to
 * pay (footer, checkout). Payments run through Razorpay, which accepts both.
 */
export default function PaymentBadges({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex items-center gap-1.5 text-[13px] font-semibold',
          tone === 'dark' ? 'text-paper-raised' : 'text-on-surface-variant',
        )}
      >
        <ShieldCheck size={15} aria-hidden="true" /> Pay securely with
      </span>
      <span className="flex h-9 items-center rounded-lg bg-white px-2.5">
        <Image src="/images/badges/phonepe-logo.png" alt="PhonePe" width={317} height={96} className="h-5 w-auto" />
      </span>
      <span className="flex h-9 items-center rounded-lg bg-white px-2.5">
        <Image src="/images/badges/googlepay-logo.png" alt="Google Pay" width={256} height={96} className="h-5 w-auto" />
      </span>
      <span className="flex h-9 items-center rounded-lg bg-white px-2.5 text-[13px] font-bold text-ink">UPI, cards</span>
    </div>
  )
}
