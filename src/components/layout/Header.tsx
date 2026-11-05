'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingBag, Search, Menu, X, User, Heart, ClipboardList } from 'lucide-react'
import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { useCartStore } from '@/store/cartStore'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'
import HeaderLocation from './HeaderLocation'
import { BrandLockup } from './Logo'
import AnimatedSearchPlaceholder from './AnimatedSearchPlaceholder'
import { motion, AnimatePresence } from 'framer-motion'
import { WA_LINK } from '@/components/home/WhatsAppFAB'

const NAV = [
  { key: 'nav.home' as const, href: '/' },
  { key: 'nav.categories' as const, href: '/search' },
  { key: 'nav.orders' as const, href: '/orders' },
]

const MORE = [
  { href: '/wishlist', label: 'Wishlist', Icon: Heart },
  { href: '/shopping-list', label: 'Shopping list', Icon: ClipboardList },
]

/** Fallback rotating terms when no category names are supplied. */
const DEFAULT_TERMS = ['shampoo', 'lipstick', 'face wash', 'hair oil', 'nail polish', 'perfume']

const iconBtn =
  'w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-paper-sunk transition-colors press'

/** The crest lockup, linking home. */
function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="shrink-0 rounded-lg" aria-label="Kuthari Beauty Store, home">
      <BrandLockup size={compact ? 'sm' : 'md'} priority />
    </Link>
  )
}

export default function Header({ searchTerms }: { searchTerms?: string[] }) {
  const terms = searchTerms && searchTerms.length > 0 ? searchTerms : DEFAULT_TERMS
  const pathname = usePathname()
  const router = useRouter()
  const totalItems = useCartStore((s) => s.totalItems())
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  // Phones: the location + search row folds away while scrolling down and
  // returns on the way up, so the sticky header stays one row tall.
  const [tucked, setTucked] = useState(false)
  const { isSignedIn, isLoaded } = useSupabaseUser()
  const { t } = useT()

  // The /search page carries its own search bar, so the header one steps aside.
  const isSearchPage = pathname === '/search'

  // Close the menu and search on navigation (state reset during render, the
  // pattern React recommends over an effect).
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMenuOpen(false)
    setSearchOpen(false)
  }

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    let last = window.scrollY
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (y < 140) setTucked(false)
        else if (y > last + 6) setTucked(true)
        else if (y < last - 6) setTucked(false)
        last = y
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!searchOpen && !menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen, menuOpen])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  const searchField = (id: string) => (
    <form onSubmit={handleSearch} role="search">
      <div className="relative w-full">
        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          id={id}
          ref={id === 'header-search-desktop' ? searchRef : undefined}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder=""
          aria-label={t('nav.searchPlaceholder')}
          className="w-full pl-12 pr-5 py-3 rounded-full bg-paper-raised border border-line focus:border-ink text-[15px] font-medium text-ink outline-none transition-colors"
        />
        {query === '' && <AnimatedSearchPlaceholder terms={terms} />}
      </div>
    </form>
  )

  const bag = (
    <Link
      href="/cart"
      data-cart-target
      className="relative flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full bg-ink text-paper-raised font-semibold text-[15px] hover:bg-ink-soft transition-colors press"
      aria-label={totalItems > 0 ? `Bag, ${totalItems} items` : 'Bag'}
    >
      <ShoppingBag size={17} strokeWidth={2.25} />
      <span>Bag</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={totalItems}
          initial={{ scale: 0.4 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="min-w-[26px] h-[26px] px-1.5 rounded-full bg-periwinkle text-ink text-[13px] font-bold flex items-center justify-center tabular-nums"
        >
          {totalItems}
        </motion.span>
      </AnimatePresence>
    </Link>
  )

  return (
    <div className="sticky top-0 z-50 w-full bg-paper/90 backdrop-blur-xl border-b border-line">
      <header className="w-full">
        {/* ── Desktop ── */}
        <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 mx-auto max-w-[1440px] px-10 py-3.5">
          <nav className="flex items-center gap-7" aria-label="Main">
            {NAV.map(({ key, href }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
                className={cn(
                  'link-underline text-[15px] font-medium transition-colors',
                  pathname === href ? 'text-ink' : 'text-ink/75 hover:text-ink',
                )}
              >
                {t(key)}
              </Link>
            ))}
            <span className="h-6 w-px bg-line" aria-hidden="true" />
            <HeaderLocation />
          </nav>

          <Wordmark />

          <div className="flex items-center justify-end gap-1.5">
            {!isSearchPage && (
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className={iconBtn}
                aria-label={searchOpen ? 'Close search' : 'Search'}
                aria-expanded={searchOpen}
                aria-controls="header-search-row"
              >
                {searchOpen ? <X size={19} strokeWidth={2.25} /> : <Search size={19} strokeWidth={2.25} />}
              </button>
            )}
            {MORE.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className={iconBtn} aria-label={label}>
                <Icon size={19} strokeWidth={2.25} />
              </Link>
            ))}
            {isLoaded && isSignedIn && (
              <Link href="/profile" className={iconBtn} aria-label={t('nav.account')}>
                <User size={19} strokeWidth={2.25} />
              </Link>
            )}
            {isLoaded && !isSignedIn && (
              <Link href="/login" className="link-underline px-3 text-[15px] font-medium text-ink">
                {t('nav.signIn')}
              </Link>
            )}
            <span className="ml-2">{bag}</span>
          </div>
        </div>

        {/* Desktop search row, opened from the search button. */}
        <AnimatePresence>
          {searchOpen && !isSearchPage && (
            <motion.div
              id="header-search-row"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block border-t border-line"
            >
              <div className="mx-auto max-w-3xl px-10 py-4">{searchField('header-search-desktop')}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mobile and tablet ── */}
        <div className="lg:hidden flex items-center gap-2 px-4 sm:px-6 py-2.5">
          <Wordmark compact />
          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/cart"
              data-cart-target
              className="relative w-10 h-10 flex items-center justify-center rounded-full bg-ink text-paper-raised press"
              aria-label={totalItems > 0 ? `Bag, ${totalItems} items` : 'Bag'}
            >
              <ShoppingBag size={17} strokeWidth={2.25} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-periwinkle text-ink text-[11px] font-bold flex items-center justify-center ring-2 ring-paper tabular-nums">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-line text-ink press"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} strokeWidth={2.25} /> : <Menu size={18} strokeWidth={2.25} />}
            </button>
          </div>
        </div>

        <div
          className={cn(
            'lg:hidden grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-soft)]',
            tucked && !menuOpen ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
          )}
        >
          <div className={cn('min-h-0', tucked && !menuOpen ? 'overflow-hidden' : 'overflow-visible')} inert={tucked && !menuOpen ? true : undefined}>
            <div className="px-4 sm:px-6 pb-3 flex flex-col gap-2.5">
              <HeaderLocation />
              {!isSearchPage && searchField('header-search-mobile')}
            </div>
          </div>
        </div>

        {/* ── Drawer (phones and tablets) ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden absolute top-full left-0 w-full max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain bg-paper border-b border-line shadow-[var(--shadow-modal)]"
            >
              <nav className="px-6 py-8 flex flex-col gap-5" aria-label="Menu">
                {NAV.map(({ key, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={pathname === href ? 'page' : undefined}
                    className={cn(
                      'font-display uppercase text-[40px] leading-[1.02] transition-colors',
                      pathname === href ? 'text-indigo' : 'text-ink hover:text-indigo',
                    )}
                  >
                    {t(key)}
                  </Link>
                ))}
                {MORE.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={pathname === href ? 'page' : undefined}
                    className={cn(
                      'font-display uppercase text-[40px] leading-[1.02] transition-colors',
                      pathname === href ? 'text-indigo' : 'text-ink hover:text-indigo',
                    )}
                  >
                    {label}
                  </Link>
                ))}
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 font-display uppercase text-[40px] leading-[1.02] text-ink hover:text-indigo transition-colors"
                >
                  <Image src="/images/whatsapp.webp" alt="" width={40} height={40} className="h-10 w-10" />
                  WhatsApp us
                </a>
                <div className="mt-3 pt-6 border-t border-line">
                  {isLoaded && isSignedIn && (
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="btn-pill">
                      <User size={16} strokeWidth={2.25} />
                      {t('nav.account')}
                    </Link>
                  )}
                  {isLoaded && !isSignedIn && (
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-pill">
                      {t('nav.signIn')}
                    </Link>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  )
}
