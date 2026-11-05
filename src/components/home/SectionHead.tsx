import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** The Anton statement. */
  title: string
  /** The Fraunces italic line that answers it, set on its own line. */
  accent?: string
  link?: { href: string; label: string }
  tone?: 'light' | 'dark'
  className?: string
  id?: string
}

/**
 * A section opener: the display head, its italic answer on the line below,
 * and an optional quiet link on the right. The italic never sits inside the
 * head itself.
 */
export default function SectionHead({ title, accent, link, tone = 'light', className, id }: Props) {
  return (
    <div className={cn('flex flex-col gap-5 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        <h2
          id={id}
          className={cn('display text-[length:var(--text-section)]', tone === 'dark' && 'text-paper-raised')}
        >
          {title}
        </h2>
        {accent && (
          <p
            className={cn(
              'accent-line -mt-1 text-[calc(var(--text-section)*0.82)]',
              tone === 'dark' && 'text-periwinkle',
            )}
          >
            {accent}
          </p>
        )}
      </div>
      {link && (
        <Link
          href={link.href}
          className={cn(
            'group/sh inline-flex items-center gap-3 self-start md:self-auto shrink-0 text-[16px] font-semibold',
            tone === 'dark' ? 'text-paper-raised' : 'text-ink',
          )}
        >
          <span className="link-underline">{link.label}</span>
          <span className="arrow-chip group-hover/sh:translate-x-1">
            <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" />
          </span>
        </Link>
      )}
    </div>
  )
}
