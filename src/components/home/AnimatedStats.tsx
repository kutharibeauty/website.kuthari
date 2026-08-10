'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const STATS = [
  { end: 27, suffix: '+', label: 'Years', subLabel: 'in Business' },
  { end: 4, suffix: '', label: 'States', subLabel: 'Served' },
  { end: 350, suffix: 'K+', label: 'Happy Customers', subLabel: 'Served' },
]

function useCountUp(end: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, active])
  return count
}

function StatItem({
  end,
  suffix,
  label,
  subLabel,
  active,
}: {
  end: number
  suffix: string
  label: string
  subLabel: string
  active: boolean
}) {
  const count = useCountUp(end, 1400, active)
  return (
    <div className="flex flex-col items-center text-center flex-1 px-1 sm:px-2 first:pl-0 last:pr-0">
      <span className="text-xl sm:text-2xl md:text-3xl font-black text-primary leading-none tabular-nums tracking-tight">
        {count}
        {suffix}
      </span>
      <span className="text-[9px] sm:text-[10px] font-black text-secondary uppercase tracking-wider mt-1.5 leading-tight">{label}</span>
      <span className="text-[8px] sm:text-[9px] font-medium text-secondary/60 leading-tight mt-0.5">{subLabel}</span>
    </div>
  )
}

export default function AnimatedStats() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="px-4 max-w-7xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="bg-gradient-to-br from-surface-container-low to-surface-container border border-table-border/60 rounded-2xl py-6 px-4 shadow-[0_3px_8px_rgba(27, 44, 61,0.02)]"
      >
        <div className="flex divide-x divide-table-border/40">
          {STATS.map((stat) => (
            <StatItem key={stat.label} {...stat} active={inView} />
          ))}
        </div>
      </motion.div>
    </section>
  )
}

