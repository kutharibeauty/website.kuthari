import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Starburst from './Starburst'

interface Props {
  items: ReactNode[]
  /** Seconds for one full pass. */
  duration?: number
  className?: string
  itemClassName?: string
  starClassName?: string
  /** Accessible summary; the moving track itself is hidden from screen readers. */
  label: string
}

/**
 * A horizontal ticker. The pass is rendered twice and slid by half its width,
 * so the loop has no seam. It pauses while hovered or focused, and stands still
 * under reduced motion (globals.css). The first pass carries the accessible
 * text; the copy is aria-hidden so nothing is read twice.
 */
export default function Marquee({ items, duration = 32, className, itemClassName, starClassName, label }: Props) {
  if (!items.length) return null
  // Short lists would leave a gap on wide screens; repeat them to fill a pass.
  const reps = Math.max(1, Math.ceil(8 / items.length))
  const pass = Array.from({ length: reps }, () => items).flat()

  const renderPass = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined} inert={hidden || undefined}>
      {pass.map((item, i) => (
        <Fragment key={i}>
          <span className={cn('shrink-0 whitespace-nowrap', itemClassName)}>{item}</span>
          <Starburst className={cn('mx-6 h-4 w-4 shrink-0 md:mx-9', starClassName)} />
        </Fragment>
      ))}
    </div>
  )

  return (
    <div className={cn('relative w-full overflow-hidden', className)} role="region" aria-label={label}>
      <div
        className="flex w-max animate-marquee"
        style={{ ['--marquee-duration' as string]: `${duration}s` }}
      >
        {renderPass(false)}
        {renderPass(true)}
      </div>
    </div>
  )
}
