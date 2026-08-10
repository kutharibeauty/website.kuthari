'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Truck, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useT } from '@/hooks/useT'

const TABS = [
  { key: 'bottomnav.home' as const, href: '/', icon: Home },
  { key: 'bottomnav.search' as const, href: '/search', icon: Search },
  { key: 'bottomnav.orders' as const, href: '/orders', icon: Truck },
  { key: 'bottomnav.profile' as const, href: '/profile', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useT()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-2xl border-t border-outline-variant/40 shadow-[0_-4px_24px_rgba(27, 44, 61,0.10)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {TABS.map(({ key, href, icon: Icon }) => {
          const active = pathname === href || (href === '/' && pathname === '/')

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-full transition-all duration-300 active:scale-95 ${
                active
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {/* Animated active pill background */}
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 bg-primary/10 rounded-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              
              <div className="relative z-10 flex flex-col items-center">
                <Icon size={20} strokeWidth={active ? 2.5 : 2} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">{t(key)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

