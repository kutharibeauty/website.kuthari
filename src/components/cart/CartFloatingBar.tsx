'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, ChevronRight, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'

/**
 * Blinkit-style floating "View Cart" bar. Appears whenever the cart has items,
 * except on the cart / checkout pages. Sits above the mobile bottom nav.
 * Uses the brand (primary/brown) theme and carries a clear-cart action.
 */
export default function CartFloatingBar() {
  const items = useCartStore((s) => s.items)
  const totalItems = useCartStore((s) => s.totalItems())
  const totalPrice = useCartStore((s) => s.totalPrice())
  const clearCart = useCartStore((s) => s.clearCart)
  const pathname = usePathname()

  const hidden =
    items.length === 0 ||
    pathname === '/cart' ||
    pathname.startsWith('/checkout')

  // Only the product page pins an Add-to-Cart / Buy-Now bar at the bottom. There,
  // lift this above that bar and narrow it so the WhatsApp FAB (w-11 at right-4,
  // itself raised to bottom-40 on product pages) sits to its right — the two then
  // read as one row instead of this bar covering the buttons. Mobile only; from
  // md up (no bottom nav) the original bottom-right placement is unchanged.
  const onProduct = pathname.startsWith('/product/')

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className={`fixed z-40 md:left-auto md:right-6 md:bottom-6 md:w-80 ${
            onProduct ? 'left-3 right-[4.5rem] bottom-40' : 'left-3 right-3 bottom-20'
          }`}
        >
          <div className="flex items-stretch bg-primary text-on-primary rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(27, 44, 61,0.35)]">
            <Link
              href="/cart"
              className="flex items-center justify-between gap-3 flex-1 min-w-0 pl-3 pr-4 py-2.5 hover:bg-primary-fixed active:scale-[0.98] transition-all duration-200"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart size={18} strokeWidth={2.5} />
                </span>
                <span className="flex flex-col leading-tight min-w-0">
                  <span className="text-[11px] font-bold text-on-primary/80">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </span>
                  <span className="text-[15px] font-black">₹{totalPrice}</span>
                </span>
              </span>
              <span className="flex items-center gap-0.5 font-black text-sm uppercase tracking-wide flex-shrink-0">
                View Cart
                <ChevronRight size={18} strokeWidth={2.5} />
              </span>
            </Link>

            <button
              type="button"
              onClick={() => clearCart()}
              aria-label="Clear cart"
              title="Clear cart"
              className="flex-shrink-0 w-12 flex items-center justify-center border-l border-white/15 text-on-primary/70 hover:text-on-primary hover:bg-white/10 active:scale-95 transition-all duration-200"
            >
              <Trash2 size={18} strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
