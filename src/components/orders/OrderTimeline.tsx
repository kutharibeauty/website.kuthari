'use client'

import { motion } from 'framer-motion'
import {
  ClipboardList,
  ThumbsUp,
  Package,
  Truck,
  Home,
  Check,
  XCircle,
} from 'lucide-react'
import type { OrderStatus } from '@/types/database.types'

const STEPS: { label: string; Icon: React.ElementType }[] = [
  { label: 'Placed', Icon: ClipboardList },
  { label: 'Accepted', Icon: ThumbsUp },
  { label: 'Packed', Icon: Package },
  { label: 'Out for Delivery', Icon: Truck },
  { label: 'Delivered', Icon: Home },
]

const STATUS_INDEX: Record<OrderStatus, number> = {
  placed: 0,
  confirmed: 1,
  packed: 2,
  shipping: 3,
  delivered: 4,
  cancelled: -1,
  returned: -1,
}

interface Props {
  status: OrderStatus
}

export default function OrderTimeline({ status }: Props) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 py-4 px-4 bg-error-container/40 rounded-xl border border-error/20">
        <XCircle size={22} className="text-error flex-shrink-0" />
        <div>
          <p className="font-bold text-on-surface text-sm">Order Cancelled</p>
          <p className="text-xs text-on-surface-variant mt-0.5">This order has been cancelled.</p>
        </div>
      </div>
    )
  }

  const activeIdx = STATUS_INDEX[status]
  // Progress fraction: between steps
  const progress = activeIdx / (STEPS.length - 1)

  return (
    <div className="relative mt-8 mb-4 px-2">
      {/* Background rail */}
      <div className="absolute top-[18px] left-8 right-8 h-1 bg-surface-container-highest rounded-full z-0" />

      {/* Animated progress fill */}
      <motion.div
        className="absolute top-[18px] left-8 h-1 bg-primary rounded-full z-0"
        initial={{ width: 0 }}
        animate={{ width: `calc(${progress * 100}% * (1 - 16px / 100%))` }}
        style={{ width: `calc(${progress} * (100% - 64px))` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Steps */}
      <div className="relative z-10 flex justify-between">
        {STEPS.map(({ label, Icon }, idx) => {
          const done = idx < activeIdx
          const active = idx === activeIdx
          const future = idx > activeIdx

          return (
            <div key={label} className="flex flex-col items-center w-16 lg:w-24">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center mb-2 ring-4 ring-surface shadow-sm relative',
                  done
                    ? 'bg-primary text-on-primary'
                    : active
                    ? 'bg-surface border-2 border-primary text-primary'
                    : 'bg-surface-container-high text-on-surface-variant',
                ].join(' ')}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                )}
                {done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
              </motion.div>

              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 + 0.1 }}
                className={[
                  'text-[10px] text-center leading-tight font-semibold',
                  done || active ? 'text-primary' : 'text-on-surface-variant',
                  active && 'font-bold',
                ].join(' ')}
              >
                {label}
              </motion.span>

              {future && (
                <span className="text-[9px] text-on-surface-variant/50 mt-0.5 hidden lg:block">
                  Pending
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
