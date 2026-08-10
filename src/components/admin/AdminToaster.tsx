'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToastStore, type ToastType } from '@/store/toastStore'

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const ICON_COLOR: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-error',
  info: 'text-primary',
}

const ACCENT: Record<ToastType, string> = {
  success: 'border-emerald-500/25',
  error: 'border-error/25',
  info: 'border-table-border',
}

/**
 * Global admin toast host. Mounted once in the admin layout; any component can
 * fire a popup via useToastStore().show('Message', 'success' | 'error' | 'info').
 */
export default function AdminToaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-[min(92vw,420px)]">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className={`pointer-events-auto w-full flex items-center gap-3 pl-4 pr-2.5 py-3 rounded-2xl bg-white border ${ACCENT[t.type]} shadow-[0_14px_44px_rgba(27, 44, 61,0.20)]`}
            >
              <Icon size={22} className={ICON_COLOR[t.type]} strokeWidth={2.5} />
              <span className="flex-1 text-sm font-bold text-primary leading-tight">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="w-7 h-7 flex items-center justify-center rounded-full text-on-surface-variant/40 hover:text-primary hover:bg-surface-container-low transition-colors flex-shrink-0"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
