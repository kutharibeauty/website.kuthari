import Link from 'next/link'
import { ArrowRight, BadgeCheck, Star } from 'lucide-react'
import SectionHead from './SectionHead'
import { MAPS_URL, JUSTDIAL_URL, INDIAMART_URL } from '@/components/layout/FooterTrust'

export interface WallReview {
  id: string
  name: string
  text: string
  rating: number
  /** What it was about, or where it was posted: a product name, "Google", "Justdial". */
  source: string
  href?: string
}

const GROUNDS = ['bg-periwinkle', 'bg-paper-raised', 'bg-ink text-paper-raised', 'bg-lilac', 'bg-haze']

function Stars({ n, light }: { n: number; light?: boolean }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={15}
          aria-hidden="true"
          className={i < n ? (light ? 'fill-periwinkle text-periwinkle' : 'fill-indigo text-indigo') : light ? 'text-paper-raised/30' : 'text-lavender'}
        />
      ))}
    </span>
  )
}

/**
 * "In their words": real reviews only. Approved product reviews from this site
 * come first, then reviews the shop has copied in from Google or Justdial
 * (Banners & CMS → Homepage → Customer reviews). With none yet, the section
 * points to where real reviews already live instead of inventing any.
 */
export default function ReviewsWall({ reviews }: { reviews: WallReview[] }) {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 md:px-10 reveal" aria-labelledby="reviews-head">
      <SectionHead id="reviews-head" title="Customer reviews" accent="in their words." />

      {reviews.length > 0 ? (
        <ul className="mt-10 columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-5 [&>li]:mb-4 md:[&>li]:mb-5">
          {reviews.slice(0, 9).map((r, i) => {
            const ground = GROUNDS[i % GROUNDS.length]
            const dark = ground.includes('bg-ink')
            return (
              <li key={r.id} className={`break-inside-avoid rounded-[var(--radius-card)] p-6 ${ground}`}>
                <Stars n={Math.max(1, Math.min(5, Math.round(r.rating)))} light={dark} />
                <blockquote className="mt-4">
                  <p className={`font-serif italic text-[21px] leading-snug ${dark ? 'text-paper-raised' : 'text-ink'}`}>
                    {r.text}
                  </p>
                </blockquote>
                <p className={`mt-5 flex items-center justify-between gap-3 text-[14px] ${dark ? 'text-paper-raised/80' : 'text-muted'}`}>
                  <span className={`font-semibold ${dark ? 'text-paper-raised' : 'text-ink'}`}>{r.name}</span>
                  {r.href ? (
                    <Link href={r.href} className="truncate capitalize underline-offset-4 hover:underline">{r.source}</Link>
                  ) : (
                    <span className="truncate capitalize">{r.source}</span>
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          {[
            { name: 'Google', line: 'See what shoppers say about the shop on Google Maps.', href: MAPS_URL },
            { name: 'Justdial', line: 'Ratings and reviews on our verified Justdial listing.', href: JUSTDIAL_URL },
            { name: 'IndiaMART', line: 'Our verified IndiaMART page for salon and bulk buyers.', href: INDIAMART_URL },
          ].map((x, i) => (
            <a
              key={x.name}
              href={x.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex flex-col justify-between gap-8 rounded-[var(--radius-card)] p-6 md:p-8 transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] ${['bg-periwinkle', 'bg-lilac', 'bg-haze'][i]}`}
            >
              <span>
                <span className="flex items-center gap-1.5 text-[14px] font-semibold text-indigo">
                  <BadgeCheck size={16} aria-hidden="true" /> Verified listing
                </span>
                <span className="display mt-4 block text-[clamp(2rem,1.5rem+1.6vw,3rem)]">{x.name}</span>
                <span className="mt-2 block text-[16px] leading-relaxed text-ink/80">{x.line}</span>
              </span>
              <span className="inline-flex items-center gap-3 text-[16px] font-semibold text-ink">
                Read reviews
                <span className="arrow-chip h-9 w-9 group-hover:translate-x-0.5">
                  <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
