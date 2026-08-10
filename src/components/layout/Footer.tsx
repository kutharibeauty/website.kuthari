import Link from 'next/link'
import { Phone, Mail, MapPin, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Logo from './Logo'
import type { Category } from '@/types/database.types'

const PHONE_NUMBERS = [
  { label: '+91 98612 35276', href: 'tel:+919861235276' },
  { label: '+91 78490 76520', href: 'tel:+917849076520' },
]

const USEFUL_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'All Categories', href: '/search' },
  { label: 'Orders', href: '/orders' },
  { label: 'Profile', href: '/profile' },
  { label: 'Cart', href: '/cart' },
]

async function getFooterCategories(): Promise<Pick<Category, 'id' | 'name' | 'slug'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('display_order')
  return data ?? []
}

export default async function Footer() {
  const categories = await getFooterCategories()

  return (
    <footer className="mt-8 md:mt-24 relative overflow-hidden bg-primary text-white border-t-2 border-primary">
      <div className="relative z-10 px-6 md:px-12 py-16 md:py-20 max-w-[1400px] mx-auto flex flex-col gap-14">
        <div className="flex flex-col lg:flex-row gap-14 lg:gap-20">
          {/* Brand & Info */}
          <div className="flex flex-col flex-shrink-0">
            <ul className="flex flex-col gap-6 text-[13px] font-medium tracking-wide text-white/65">
              <li className="flex items-center gap-4 group cursor-pointer hover:text-white transition-colors">
                <MapPin size={24} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-300" />
                <span className="max-w-[240px] leading-relaxed">
                  Marthapeta St, Sano Bazar<br />Back side of Ganesh Market<br />Brahmapur, Odisha 760009
                </span>
              </li>
              <li className="flex items-center gap-4 group/item hover:text-white transition-colors">
                <Phone size={24} strokeWidth={2.5} className="group-hover/item:-rotate-12 transition-transform duration-300 flex-shrink-0" />
                <span className="flex flex-col gap-1">
                  {PHONE_NUMBERS.map((p) => (
                    <a key={p.href} href={p.href} className="hover:text-white transition-colors">
                      {p.label}
                    </a>
                  ))}
                </span>
              </li>
              <li className="flex items-center gap-4 group/item hover:text-white transition-colors">
                <Mail size={24} strokeWidth={2.5} className="group-hover/item:rotate-12 transition-transform duration-300 flex-shrink-0" />
                <a href="mailto:smortika@gmail.com" className="hover:text-white transition-colors normal-case tracking-normal">
                  smortika@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-4 group/item hover:text-white transition-colors">
                {/* Inline glyph — lucide-react v1 no longer ships brand icons. */}
                <svg
                  viewBox="0 0 24 24"
                  width={24}
                  height={24}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="group-hover/item:-rotate-12 transition-transform duration-300 flex-shrink-0"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                <a
                  href="https://www.instagram.com/k_beauty_store923/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors normal-case tracking-normal"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>

          {/* Useful Links */}
          <div className="flex flex-col flex-shrink-0">
            <h5 className="text-[10px] font-semibold text-white/45 uppercase tracking-[0.22em] mb-6">
              Useful Links
            </h5>
            <ul className="flex flex-col gap-3">
              {USEFUL_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm font-medium text-white/60 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories — synced live from the admin panel */}
          {categories.length > 0 && (
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-5">
                <h5 className="text-[10px] font-semibold text-white/45 uppercase tracking-[0.22em]">
                  Categories
                </h5>
                <Link
                  href="/search"
                  className="link-underline text-[11px] font-semibold tracking-wide text-secondary hover:text-secondary/80 transition-colors"
                >
                  see all
                </Link>
              </div>
              <div className="columns-2 sm:columns-3 gap-x-8">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="block break-inside-avoid text-sm font-medium text-white/60 hover:text-white transition-colors py-1.5"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Massive Logo — cream section matching the site background. Icon-only
          image + a live text wordmark (not baked into the artwork), so the
          store name can change without needing new artwork. */}
      <div className="w-full bg-background text-primary pt-10 pb-32 md:pb-10 flex flex-col items-center justify-center overflow-hidden">
        <Link href="/" className="inline-flex flex-col items-center group hover:scale-[1.02] transition-transform duration-700">
          {/* Width derived from the height x the 364:498 icon aspect, so the
              browser fetches a variant that matches instead of the full 364px. */}
          <Logo
            variant="mark"
            className="h-24 sm:h-32 md:h-40 lg:h-44 w-auto"
            sizes="(min-width: 1024px) 129px, (min-width: 768px) 117px, (min-width: 640px) 94px, 70px"
          />
          <span className="mt-3 sm:mt-4 font-heading font-black tracking-tight text-primary text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-none">
            KUTHARI
          </span>
          <span className="mt-1.5 sm:mt-2 font-sans font-bold tracking-[0.35em] text-on-surface-variant text-[10px] sm:text-xs md:text-sm uppercase">
            Beauty Store
          </span>
        </Link>
        <div className="mt-8 flex flex-col md:flex-row items-center gap-4 text-[10px] font-medium tracking-[0.22em] text-on-surface-variant/60 uppercase">
          <span>© 2026 Kuthari Beauty Store</span>
          <span className="hidden md:inline">·</span>
          <span>Retail &amp; Bulk Supplier</span>
          <span className="hidden md:inline">·</span>
          <span>Odisha</span>
        </div>

        {/* Developer credit — the last thing on the page. Styled from the same
            tokens as the rest of the site (cream card, table-border outline,
            primary on hover) rather than a fixed dark pill, so it belongs to
            this cream band instead of sitting on top of it. */}
        <div className="group mt-6 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border-2 border-table-border bg-surface-card px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70 transition-all duration-200 hover:border-primary/40 hover:shadow-sm">
          <span>Crafted with</span>
          <Heart
            size={12}
            strokeWidth={2.5}
            className="fill-error text-error transition-transform duration-200 group-hover:scale-125"
          />
          <span>by</span>
          <a
            href="https://jyotiranjansahoo.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Jyotiranjan — open portfolio in a new tab"
            className="text-primary tracking-[0.12em] normal-case text-[11px] underline-offset-4 hover:underline transition-colors"
          >
            Jyotiranjan
          </a>
        </div>
      </div>
    </footer>
  )
}

