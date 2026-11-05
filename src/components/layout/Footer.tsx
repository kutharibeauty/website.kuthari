import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { BrandLockup } from './Logo'
import { FooterMap, VerifiedListings } from './FooterTrust'
import PaymentBadges from './PaymentBadges'
import Image from 'next/image'
import { getStoreContent } from '@/lib/data/store-content'
import type { Category } from '@/types/database.types'

const ACCOUNT_LINKS = [
  { label: 'Orders', href: '/orders' },
  { label: 'Profile', href: '/profile' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'Shopping list', href: '/shopping-list' },
  { label: 'Bag', href: '/cart' },
]

const HELP_LINKS = [
  { label: 'Contact us', href: '/contact' },
  { label: 'Shipping and delivery', href: '/shipping-policy' },
  { label: 'Cancellations & replacements', href: '/refund-policy' },
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Terms of use', href: '/terms' },
]

/**
 * Cached + admin client on purpose, NOT the cookie-scoped one: this footer
 * renders inside the layout on every shop page, and the product page is
 * statically generated (`revalidate = 60`). Calling `cookies()` here failed
 * that render with DYNAMIC_SERVER_USAGE, a hard 500 on every /product/* URL.
 * Nothing here is per-user, so caching also saves a query per navigation.
 */
const getFooterCategories = unstable_cache(
  async (): Promise<Pick<Category, 'id' | 'name' | 'slug'>[]> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('display_order')
    return data ?? []
  },
  ['footer-categories'],
  { revalidate: 300, tags: ['shop-chrome'] },
)

const colHead = 'text-[14px] font-normal text-periwinkle mb-4'
const colLink = 'text-[17px] font-semibold text-paper-raised hover:text-periwinkle transition-colors'

export default async function Footer() {
  const [categories, content] = await Promise.all([getFooterCategories(), getStoreContent()])
  const { contact, social } = content
  const socials = [
    { label: 'Instagram', href: social.instagram },
    { label: 'Facebook', href: social.facebook },
    { label: 'YouTube', href: social.youtube },
  ].filter((x) => x.href)

  return (
    <footer className="mt-[var(--spacing-section)] bg-ink-deep text-paper-raised pb-24">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 pt-16 md:pt-24 pb-10">
        <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] gap-x-8 gap-y-12">
          {/* Visit: the shop itself leads, because it is the business. */}
          <div className="col-span-2 lg:col-span-1 flex flex-col gap-5">
            <Link href="/" className="w-max rounded-xl bg-paper-raised px-4 py-3" aria-label="Kuthari Beauty Store, home">
              <BrandLockup size="lg" />
            </Link>
            <p className="text-[16px] text-paper-raised">Open {contact.hours}</p>
            <FooterMap address={contact.address} />
            <VerifiedListings />
          </div>

          {categories.length > 0 && (
            <div>
              <h2 className={colHead}>Shop</h2>
              <ul className="flex flex-col gap-2.5">
                {categories.slice(0, 7).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/category/${cat.slug}`} className={colLink}>
                      {cat.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/search" className={colLink}>
                    Everything
                  </Link>
                </li>
              </ul>
            </div>
          )}

          <div>
            <h2 className={colHead}>Your account</h2>
            <ul className="flex flex-col gap-2.5">
              {ACCOUNT_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className={colLink}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={colHead}>Help</h2>
            <ul className="flex flex-col gap-2.5">
              {HELP_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className={colLink}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <h2 className={`${colHead} mt-8`}>Talk to us</h2>
            <ul className="flex flex-col gap-2.5">
              {contact.phones.map((p) => (
                <li key={p}>
                  <a href={`tel:${p.replace(/[^d+]/g, '')}`} className={colLink}>
                    {p}
                  </a>
                </li>
              ))}
              <li>
                <a href={`mailto:${contact.email}`} className={colLink}>
                  {contact.email}
                </a>
              </li>
              {socials.map((x) => (
                <li key={x.label}>
                  <a href={x.href} target="_blank" rel="noopener noreferrer" className={colLink}>
                    {x.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <PaymentBadges className="mt-12" />

        <div className="mt-8 pt-6 border-t border-paper-raised/25 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-[14px] text-paper-raised">
          <p>© 2026 Kuthari Beauty Store, Brahmapur</p>
          <a
            href="https://jyotiranjansahoo.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 w-max"
            aria-label="Designed and developed by Crayora"
          >
            <span>Designed and developed by</span>
            <span className="crayora-glow">
              <Image src="/images/crayora-light.png" alt="Crayora" width={600} height={200} className="relative h-7 w-auto" />
            </span>
          </a>
        </div>
      </div>
    </footer>
  )
}
