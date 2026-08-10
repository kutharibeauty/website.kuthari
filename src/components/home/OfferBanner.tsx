import Image from 'next/image'
import Link from 'next/link'
import type { OfferBannerConfig } from '@/types/database.types'

interface Props {
  data: OfferBannerConfig
}

export default function OfferBanner({ data }: Props) {
  return (
    <section className="px-4 max-w-7xl mx-auto w-full">
      <Link
        href={data.link_url}
        className="block relative w-full aspect-[16/5] md:aspect-[21/5] rounded-3xl overflow-hidden border border-table-border/60 shadow-md hover:shadow-[0_16px_40px_rgba(27, 44, 61,0.12)] hover:-translate-y-1.5 transition-all duration-500 group"
      >
        <Image
          src={data.image_url}
          alt={data.alt_text}
          fill
          sizes="100vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        
        {/* Subtle glass overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay" />
        
        {/* Sweeping shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
      </Link>
    </section>
  )
}
