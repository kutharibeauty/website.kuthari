'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, ShoppingBag, Truck, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useT } from '@/hooks/useT'

const TABS = [
  { label: null, key: 'bottomnav.home' as const, href: '/', icon: Home },
  { label: 'Shop', key: null, href: '/search', icon: Search },
  { label: 'Bag', key: null, href: '/cart', icon: ShoppingBag },
  { label: null, key: 'bottomnav.orders' as const, href: '/orders', icon: Truck },
  { label: 'Account', key: null, href: '/profile', icon: User },
]

/**
 * The phone's main navigation. The bag sits in the middle with a live count,
 * so a shopper is always one tap from checkout.
 */
export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useT()
  const totalItems = useCartStore((s) => s.totalItems())

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-paper/95 backdrop-blur-2xl border-t border-line pb-[env(safe-area-inset-bottom)]"
      aria-label="Shop"
    >
      <div className="grid grid-cols-5 h-16 px-1 max-w-lg mx-auto">
        {TABS.map(({ label, key, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
          const text = label ?? t(key!)
          const isBag = href === '/cart'

          return (
            <Link
              key={href}
              href={href}
              {...(isBag ? { 'data-cart-target': true } : {})}
              aria-current={active ? 'page' : undefined}
              aria-label={isBag && totalItems > 0 ? `Bag, ${totalItems} items` : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
                active ? 'text-ink' : 'text-muted'
              }`}
            >
              <span className="relative flex h-8 w-12 items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="bottomNavIndicator"
                    className="absolute inset-0 rounded-full bg-periwinkle"
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 2} className="relative" aria-hidden="true" />
                {isBag && totalItems > 0 && (
                  <span className="absolute -top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-ink text-paper-raised text-[11px] font-bold flex items-center justify-center tabular-nums ring-2 ring-paper">
                    {totalItems}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-semibold leading-none">{text}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
