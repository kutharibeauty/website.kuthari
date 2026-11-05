'use client'

import Image from 'next/image'
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
const WA_MESSAGE = encodeURIComponent('Hi Kuthari Beauty Store, I have a question about an order.')
export const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`

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
  // Desktop only: on a phone the bottom bar and the buy buttons own that
  // corner, so WhatsApp lives in the menu instead (Header.tsx).
  const bottomClass = hasCart ? 'bottom-28' : 'bottom-6'

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 220, damping: 14 }}
      className={`hidden md:block fixed right-6 z-50 transition duration-300 ${bottomClass}`}
    >
      <Link
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Order on WhatsApp"
        title="Order on WhatsApp"
        className="flex items-center justify-center rounded-full shadow-[var(--shadow-lift)] hover:scale-105 active:scale-95 transition duration-200"
      >
        <Image src="/images/whatsapp.webp" alt="" width={56} height={56} className="h-14 w-14" />
      </Link>
    </motion.div>
  )
}
