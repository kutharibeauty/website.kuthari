'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database.types'

type StripCategory = Pick<Category, 'id' | 'name' | 'name_or' | 'slug' | 'image_url'>

/**
 * Horizontal category switcher: a scrollable row of image tiles with labels.
 * The image is the admin-uploaded `image_url` — use a transparent background so
 * it reads as an icon; it is shown object-contain on a light rounded tile
 * (`rounded-full` resolves to 12px here, see `--radius-full` in globals.css).
 * The active category is highlighted.
 */
export default function CategoryStrip({
  categories,
  activeSlug,
  mobileGrid = false,
}: {
  categories: StripCategory[]
  activeSlug?: string
  /** Homepage only: show a 3-per-row grid on phones (still a scroll strip from
   *  `sm` up). Off by default so the category-page switcher stays a scroll row. */
  mobileGrid?: boolean
}) {
  const { tField } = useT()
  if (!categories.length) return null

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-5">
      <div
        className={cn(
          'scrollbar-hide -mx-1 px-1',
          mobileGrid
            ? 'grid grid-cols-3 gap-x-3 gap-y-5 pb-1 sm:flex sm:gap-6 sm:overflow-x-auto sm:pb-3'
            : 'flex gap-4 sm:gap-6 overflow-x-auto pb-3',
        )}
      >
        {categories.map((cat) => {
          const active = cat.slug === activeSlug
          const name = tField(cat.name, cat.name_or)
          return (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-2.5 group',
                mobileGrid ? 'w-full sm:w-[112px] sm:flex-shrink-0' : 'flex-shrink-0 w-[92px] sm:w-[112px]',
              )}
            >
              <div
                className={cn(
                  'w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] rounded-full flex items-center justify-center overflow-hidden border-2 transition-all duration-200 active:scale-95',
                  active
                    // Arbitrary values cannot contain spaces — `rgba(27, 44, 61,0.07)`
                    // silently produced no class at all, so the ring never rendered.
                    ? 'border-primary bg-primary/[0.06] shadow-[0_0_0_3px_rgb(27_44_61_/_0.07)]'
                    : 'border-table-border bg-surface-container group-hover:border-primary/40',
                )}
              >
                {cat.image_url ? (
                  <Image
                    src={cat.image_url}
                    alt={name}
                    width={104}
                    height={104}
                    className="w-full h-full object-contain p-3"
                  />
                ) : (
                  <span className="text-2xl font-black text-primary">{cat.name.charAt(0)}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-[13px] sm:text-sm font-bold text-center leading-tight line-clamp-2 transition-colors',
                  active ? 'text-primary' : 'text-on-surface-variant/80 group-hover:text-primary',
                )}
              >
                {name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
