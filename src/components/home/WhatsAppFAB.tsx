'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useOverlayStore } from '@/store/overlayStore'

/**
 * Routes that must NOT show the button. Cart and checkout are the paying
 * journey — a floating "order on WhatsApp" there competes with the actual
 * checkout and invites the customer to abandon a cart they've already filled.
 *
 * /checkout already sits outside the (shop) group that renders this, so it
 * would not receive it anyway; it's listed so the rule stays true if the route
 * ever moves.
 */
const HIDDEN_PREFIXES = ['/cart', '/checkout']

// NOTE: NEXT_PUBLIC_WHATSAPP_NUMBER wins over this fallback wherever it is set,
// so changing the number here alone will NOT change it in production — the
// Vercel env var has to be updated too.
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919861235276'
const WA_MESSAGE = encodeURIComponent('Hi Kuthari Beauty Store, I want to place a bulk order.')
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`

export default function WhatsAppFAB() {
  const pathname = usePathname()
  // Ride above the floating "View Cart" bar when the cart has items.
  const hasCart = useCartStore((s) => s.items.length > 0)
  // Hide while a full-screen overlay (e.g. the box quick-add sheet) is open.
  const overlayOpen = useOverlayStore((s) => s.count > 0)

  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (hidden || overlayOpen) return null

  // A product page pins its Add to Cart / Buy Now bar just above the bottom nav,
  // so sit above THAT here rather than covering it. Elsewhere the offset only
  // lifts when the floating "View Cart" bar is showing.
  const onProduct = pathname?.startsWith('/product/') ?? false
  const bottomClass = onProduct
    ? 'bottom-40 md:bottom-6'
    : hasCart
      ? 'bottom-40 md:bottom-28'
      : 'bottom-24 md:bottom-6'

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 220, damping: 14 }}
      className={`fixed right-4 z-50 transition-all duration-300 ${bottomClass}`}
    >
      <Link
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Order on WhatsApp"
        title="Order on WhatsApp"
        className="flex items-center justify-center w-11 h-11 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </Link>
    </motion.div>
  )
}
