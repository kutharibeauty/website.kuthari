'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthPromptStore } from '@/store/authPromptStore'

/**
 * Global popup shown when a signed-out user tries to add a product to the cart.
 * Rendered once in the shop layout; triggered via useAuthPromptStore().show().
 */
export default function LoginPromptModal() {
  const { open, hide } = useAuthPromptStore()
  const pathname = usePathname()
  const router = useRouter()

  const goLogin = () => {
    hide()
    router.push(`/login?next=${encodeURIComponent(pathname || '/')}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={hide}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-surface-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-8 relative"
          >
            <button
              onClick={hide}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant/50 hover:bg-surface-container-low hover:text-primary transition-colors"
            >
              <X size={16} strokeWidth={2.5} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <ShoppingCart size={24} className="text-primary" strokeWidth={2.5} />
            </div>

            <h3 className="text-xl font-black text-primary tracking-tight">Log in to add to cart</h3>
            <p className="text-sm font-medium text-on-surface-variant mt-1.5 leading-relaxed">
              Please sign in with your mobile number to start your order. It only takes a few seconds.
            </p>

            <div className="flex flex-col gap-2.5 mt-6">
              <button
                onClick={goLogin}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
              >
                Log In / Sign Up
              </button>
              <button
                onClick={hide}
                className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-on-surface-variant/70 hover:text-primary transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
