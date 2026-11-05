import Image from 'next/image'
import Link from 'next/link'
import type { OfferBannerConfig } from '@/types/database.types'

interface Props {
  data: OfferBannerConfig
}

/** The mid-page offer image from Banners & CMS, set as a wide rounded panel. */
export default function OfferBanner({ data }: Props) {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 md:px-10 reveal">
      <Link
        href={data.link_url}
        className="group block relative w-full aspect-[16/6] md:aspect-[21/6] overflow-hidden rounded-[var(--radius-panel)] bg-paper-sunk transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
      >
        <Image src={data.image_url} alt={data.alt_text} fill sizes="(max-width: 768px) 100vw, 1360px" className="object-cover" />
      </Link>
    </section>
  )
}
