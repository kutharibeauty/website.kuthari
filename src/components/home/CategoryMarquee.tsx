import Link from 'next/link'
import Marquee from '@/components/ui/Marquee'
import type { Category } from '@/types/database.types'

type Item = Pick<Category, 'id' | 'name' | 'slug'>

/** The periwinkle band under the hero: every aisle in the shop, rolling past. */
export default function CategoryMarquee({ categories }: { categories: Item[] }) {
  if (!categories.length) return null
  return (
    <Marquee
      label="Shop by category"
      duration={46}
      className="bg-periwinkle py-5 md:py-7"
      starClassName="h-9 w-9 md:h-12 md:w-12 text-indigo"
      items={categories.map((c) => (
        <Link
          key={c.id}
          href={`/category/${c.slug}`}
          className="font-display uppercase text-ink text-[clamp(2.5rem,1.6rem+3.6vw,5rem)] leading-[1.02] hover:text-indigo transition-colors"
        >
          {c.name}
        </Link>
      ))}
    />
  )
}
