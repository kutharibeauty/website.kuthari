'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, Search, Menu, X, Home, Grid, Truck, User, Heart, ClipboardList } from 'lucide-react'
import { useState, useEffect, type FormEvent } from 'react'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { useCartStore } from '@/store/cartStore'
import { useT } from '@/hooks/useT'
import LanguageToggle from './LanguageToggle'
import HeaderLocation from './HeaderLocation'
import Logo from './Logo'
import AnimatedSearchPlaceholder from './AnimatedSearchPlaceholder'
import { motion, AnimatePresence } from 'framer-motion'

const NAV = [
  { key: 'nav.home' as const, href: '/', icon: Home },
  { key: 'nav.categories' as const, href: '/search', icon: Grid },
  { key: 'nav.orders' as const, href: '/orders', icon: Truck },
]

/** Fallback rotating terms when no category names are supplied. */
const DEFAULT_TERMS = ['shampoo', 'lipstick', 'face wash', 'hair oil', 'nail polish', 'perfume']

export default function Header({ searchTerms }: { searchTerms?: string[] }) {
  const terms = searchTerms && searchTerms.length > 0 ? searchTerms : DEFAULT_TERMS
  const pathname = usePathname()
  const router = useRouter()
  const totalItems = useCartStore((s) => s.totalItems())
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { isSignedIn, isLoaded } = useSupabaseUser()
  const { t } = useT()

  // The /search page carries its own search bar — drop the header one on mobile
  // there to avoid two stacked search inputs.
  const isSearchPage = pathname === '/search'

  // Close the drawer on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-white border-b border-outline-variant/50 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transform-gpu backface-hidden will-change-transform">
      <header className="w-full">
        <div className="mx-auto max-w-7xl flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center flex-shrink-0 group">
            <Logo className="h-11 md:h-12 w-auto group-hover:scale-105 transition-transform duration-300" priority />
            {/* Brand name beside the mark, on every size. Kept nowrap inside the
                shrink-0 logo block; the search bar is flex-1 so it gives up the
                width instead of this wrapping or the row overflowing. */}
            <span className="ml-2 font-black text-primary text-[13px] sm:text-sm lg:text-base uppercase tracking-wide leading-none whitespace-nowrap">
              Kuthari Beauty Store
            </span>
          </Link>

          {/* ── Delivery location (desktop) ── */}
          <div className="hidden md:flex items-center flex-shrink-0 pl-4 ml-1 border-l border-outline-variant/40">
            <HeaderLocation />
          </div>

          {/* ── Search bar (desktop, centered) ── */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-auto">
            <div className="relative w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder=""
                aria-label={t('nav.searchPlaceholder')}
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-surface-container-low border border-transparent focus:border-primary/30 focus:bg-white text-sm font-medium text-primary placeholder:text-on-surface-variant/50 outline-none transition-colors"
              />
              {query === '' && <AnimatedSearchPlaceholder terms={terms} />}
            </div>
          </form>

          {/* ── Right cluster (desktop) ── */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0 ml-auto">
            <LanguageToggle />

            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-low text-primary transition-colors"
              aria-label="Menu"
            >
              <Menu size={18} strokeWidth={2.5} />
            </button>

            {isLoaded && isSignedIn && (
              <Link
                href="/profile"
                className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-container-low transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center">
                  <User size={14} strokeWidth={2.5} />
                </span>
                <span className="text-sm font-black text-primary">{t('nav.account')}</span>
              </Link>
            )}
            {isLoaded && !isSignedIn && (
              <Link
                href="/login"
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl hover:bg-surface-container-low text-sm font-black text-primary transition-colors"
              >
                {t('nav.signIn')}
              </Link>
            )}

            <Link
              href="/wishlist"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low hover:bg-surface-container text-primary transition-colors"
              aria-label="Wishlist"
            >
              <Heart size={18} strokeWidth={2.5} />
            </Link>

            <Link
              href="/shopping-list"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low hover:bg-surface-container text-primary transition-colors"
              aria-label="Shopping list"
            >
              <ClipboardList size={18} strokeWidth={2.5} />
            </Link>

            <Link
              href="/cart"
              data-cart-target
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-black text-sm transition-colors"
            >
              <ShoppingCart size={18} strokeWidth={2.5} />
              {t('nav.myCart')}
              <AnimatePresence mode="popLayout">
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    key={totalItems}
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center px-1"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* ── Mobile right controls ── */}
          <div className="flex lg:hidden items-center gap-2 ml-auto flex-shrink-0">
            <LanguageToggle />
            <Link
              href="/cart"
              data-cart-target
              className="relative w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low text-primary transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart size={17} strokeWidth={2.5} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white active:scale-95 transition-transform"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {menuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={18} strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={18} strokeWidth={2.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* ── Mobile: location + search (second row) ── */}
        <div className="md:hidden px-4 pb-3 flex flex-col gap-2.5">
          <HeaderLocation />
          {!isSearchPage && (
            <form onSubmit={handleSearch}>
              <div className="relative w-full">
                {/* /80 not /50: 4.66:1 vs 2.37:1 on the #FAF5E9 search bar. */}
                <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/80 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder=""
                  // The visible cue is the animated overlay below, which screen
                  // readers can't use — so name the field explicitly. Nothing
                  // visual changes.
                  aria-label={t('nav.searchPlaceholder')}
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-surface-container-low border border-transparent focus:border-primary/30 focus:bg-white text-sm font-medium text-primary placeholder:text-on-surface-variant/50 outline-none transition-colors"
                />
                {query === '' && <AnimatedSearchPlaceholder terms={terms} />}
              </div>
            </form>
          )}
        </div>

        {/* ── Dropdown drawer (nav links, account, language) ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden bg-white absolute top-full left-0 w-full border-b border-outline-variant/30 shadow-2xl"
            >
              <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col gap-6">
                {NAV.map(({ key, href }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl font-black uppercase tracking-tighter transition-all duration-300 flex items-center justify-between ${
                        active ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      <span>{t(key)}</span>
                      {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </Link>
                  )
                })}

                {/* Wishlist + Shopping list (kept out of the crowded top bar on mobile) */}
                {[
                  { href: '/wishlist', label: 'Wishlist', Icon: Heart },
                  { href: '/shopping-list', label: 'Shopping List', Icon: ClipboardList },
                ].map(({ href, label, Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl font-black uppercase tracking-tighter transition-all duration-300 flex items-center justify-between ${
                        active ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      <span className="flex items-center gap-3"><Icon size={22} strokeWidth={2.5} /> {label}</span>
                      {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </Link>
                  )
                })}

                <div className="my-2 h-px bg-outline-variant/20" />

                <div className="flex items-center justify-end">
                  {isLoaded && isSignedIn && (
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                        <User size={16} strokeWidth={2.5} />
                      </span>
                      <span className="text-sm font-black text-primary tracking-wide uppercase">{t('nav.account')}</span>
                    </Link>
                  )}
                  {isLoaded && !isSignedIn && (
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="px-6 py-3 bg-primary text-white text-sm font-black uppercase tracking-[0.1em] rounded-full active:scale-95 transition-transform"
                    >
                      {t('nav.signIn')}
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  )
}
