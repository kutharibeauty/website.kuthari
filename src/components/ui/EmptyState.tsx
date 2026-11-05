import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Logo from '@/components/layout/Logo'

interface Props {
  /** Kept for callers; empty states now show the brand mark. */
  art?: string
  title: string
  accent?: string
  text?: string
  action?: { href: string; label: string }
  secondary?: { href: string; label: string }
}

/** A friendly empty or error state: the brand mark, the display head, one line, and the way back. */
export default function EmptyState({ title, accent, text, action, secondary }: Props) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-14 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-periwinkle">
        <Logo className="h-16 w-auto" sizes="48px" />
      </span>
      <h1 className="display mt-6 text-[clamp(2.5rem,1.8rem+3vw,4.5rem)]">{title}</h1>
      {accent && <p className="accent-line text-[clamp(2rem,1.4rem+2.4vw,3.5rem)]">{accent}</p>}
      {text && <p className="mt-4 max-w-[40ch] text-[17px] leading-relaxed text-ink/80">{text}</p>}
      {(action || secondary) && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Link href={action.href} className="btn-pill group/es">
              {action.label}
              <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" className="transition-transform group-hover/es:translate-x-1" />
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className="btn-pill !bg-transparent !text-ink border border-ink/25 hover:!border-ink">
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
