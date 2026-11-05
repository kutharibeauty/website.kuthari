import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import SectionHead from './SectionHead'
import type { Category } from '@/types/database.types'

type Item = Pick<Category, 'id' | 'name' | 'slug' | 'image_url'>

const GROUNDS = ['bg-periwinkle', 'bg-lilac', 'bg-paper-raised', 'bg-haze', 'bg-paper-sunk']

// Spelled out so Tailwind sees every class name.
const SPAN = { 1: 'col-span-1', 2: 'col-span-2' } as const
const LG_SPAN = { 1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3', 4: 'lg:col-span-4' } as const

/** The closing "Everything" tile fills whatever the last row has left. */
function closingSpan(n: number) {
  const smalls = n - 1 // the first tile is 2 x 2 at every size
  const mobile: 1 | 2 = smalls % 2 === 1 ? 1 : 2
  const left = (4 - ((4 + smalls) % 4)) % 4
  const desk = (left === 0 ? 4 : left) as 1 | 2 | 3 | 4
  return `${SPAN[mobile]} ${LG_SPAN[desk]}`
}

/**
 * The store's own line icons (public/images/categories) are transparent line
 * art, so they are drawn as a mask and take the navy ink. An admin-uploaded
 * photo is shown as a picture instead.
 */
function CategoryArt({ src, big }: { src: string | null; big: boolean }) {
  if (!src) return null
  const size = big ? 'h-44 w-44 md:h-60 md:w-60' : 'h-20 w-20 md:h-24 md:w-24'
  if (src.startsWith('/images/categories/')) {
    return (
      <span
        aria-hidden="true"
        className={cn('block bg-ink transition-transform duration-500 ease-[var(--ease-squish)] group-hover:-rotate-6', size)}
        style={{
          maskImage: `url(${src})`,
          WebkitMaskImage: `url(${src})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      />
    )
  }
  return (
    <span className={cn('relative block', size)}>
      <Image src={src} alt="" fill sizes={big ? '240px' : '96px'} className="object-contain" />
    </span>
  )
}

/**
 * "What's on your list": every aisle as a tile showing a real photo from that
 * aisle (the first product with one). The busiest aisle gets the big tile,
 * each label carries its real product count, and an aisle with no products
 * yet falls back to its line icon.
 */
export default function CategoryBento({
  categories,
  counts,
  covers = {},
  title = "What's on your list",
  accent = 'today?',
}: {
  categories: Item[]
  counts: Record<string, number>
  title?: string
  accent?: string
  /** category id → a product photo from that aisle */
  covers?: Record<string, string | null>
}) {
  if (!categories.length) return null
  const ordered = [...categories].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))

  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 md:px-10 reveal" aria-labelledby="aisles-head">
      <SectionHead id="aisles-head" title={title} accent={accent} link={{ href: '/search', label: 'Every aisle' }} />

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 auto-rows-[200px] md:auto-rows-[240px] gap-4 md:gap-5">
        {ordered.map((c, i) => {
          const big = i === 0
          const count = counts[c.id] ?? 0
          return (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] p-3 md:p-4 transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]',
                GROUNDS[i % GROUNDS.length],
                big && 'col-span-2 row-span-2',
              )}
            >
              {covers[c.id] ? (
                <>
                  <Image
                    src={covers[c.id]!}
                    alt=""
                    fill
                    sizes={big ? '(max-width: 1024px) 92vw, 680px' : '(max-width: 1024px) 46vw, 330px'}
                    className="object-cover"
                  />
                  {/* A soft fade at the foot so the label always reads. */}
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/45 to-transparent" aria-hidden="true" />
                  <span className="flex-1" />
                </>
              ) : (
                <span className="flex flex-1 items-center justify-center">
                  <CategoryArt src={c.image_url} big={big} />
                </span>
              )}
              <span className="relative flex w-max max-w-full items-center gap-2 md:gap-3 rounded-[1.25rem] bg-paper-raised py-1.5 pl-3 md:pl-4 pr-1.5 shadow-[var(--shadow-card)]">
                <span className="min-w-0">
                  <span className="block text-[14px] md:text-[16px] font-semibold leading-tight text-ink">{c.name}</span>
                  {count > 0 && (
                    <span className="block text-[12px] text-muted">
                      {count} {count === 1 ? 'product' : 'products'}
                    </span>
                  )}
                </span>
                <span className="arrow-chip h-8 w-8 md:h-9 md:w-9 group-hover:translate-x-0.5">
                  <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                </span>
              </span>
            </Link>
          )
        })}
        <Link
          href="/search"
          className={cn('group relative overflow-hidden flex flex-col items-start justify-end gap-3 sm:flex-row sm:items-end sm:justify-between', closingSpan(ordered.length), ' rounded-[var(--radius-card)] bg-ink p-5 md:p-6 text-paper-raised transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]')}
        >
          <span className="display relative text-paper-raised whitespace-nowrap text-[clamp(1.6rem,1rem+2.6vw,3.5rem)]">Everything</span>
          <span className="arrow-chip h-12 w-12 group-hover:translate-x-1">
            <ArrowRight size={20} strokeWidth={2.5} aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  )
}
