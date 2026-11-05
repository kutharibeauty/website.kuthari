import Image from 'next/image'
import { BadgeCheck, MapPin } from 'lucide-react'

export const MAPS_URL =
  'https://www.google.com/maps/place/Kuthari+Fancy+Store/@19.316888,84.7771064,17z/data=!3m1!4b1!4m6!3m5!1s0x3a3d501b412bc7f9:0x9b41b66e4cbf4e49!8m2!3d19.316888!4d84.7796813!16s%2Fg%2F11gb3s42l2'
export const JUSTDIAL_URL =
  'https://www.justdial.com/Berhampur-Odisha/Kuthari-Fancy-Store-Near-Sano-Bazar-Nabeen/9999PX680-X680-171202172827-T1A7_BZDET'
export const INDIAMART_URL = 'https://www.indiamart.com/kothari-fency-store/'

// The keyless embed: the shop by name, centred on its coordinates, so Google
// draws a labelled pin. No API key, and it only loads when scrolled near.
const EMBED_SRC =
  'https://www.google.com/maps?q=Kuthari+Fancy+Store,+Marthapeta+St,+Brahmapur&ll=19.316888,84.7796813&z=17&hl=en&output=embed'

/** The shop on a small map, with a link to open it in Google Maps. */
export function FooterMap({ address }: { address: string }) {
  return (
    <div className="w-full max-w-[360px]">
      <div className="overflow-hidden rounded-2xl border border-paper-raised/20 bg-ink-soft">
        <iframe
          src={EMBED_SRC}
          title="Kuthari Fancy Store on Google Maps"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-[170px] w-full border-0"
        />
      </div>
      <a
        href={MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 inline-flex items-start gap-2 text-[14px] text-paper-raised hover:text-periwinkle transition-colors"
      >
        <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {address}
          <span className="block font-semibold underline underline-offset-4">Get directions</span>
        </span>
      </a>
    </div>
  )
}

/** Listings the store is verified on, each linking to the real listing. */
export function VerifiedListings() {
  const listings = [
    {
      name: 'Justdial',
      href: JUSTDIAL_URL,
      mark: (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-justdial text-[15px] font-bold text-white" aria-hidden="true">
          Jd
        </span>
      ),
    },
    {
      name: 'IndiaMART',
      href: INDIAMART_URL,
      mark: (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white" aria-hidden="true">
          <Image src="/images/badges/indiamart.png" alt="" width={28} height={28} className="h-7 w-7" />
        </span>
      ),
    },
  ]
  return (
    <ul className="flex flex-wrap gap-3" aria-label="Verified listings">
      {listings.map((l) => (
        <li key={l.name}>
          <a
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-paper-raised/20 bg-paper-raised/5 py-2 pl-2 pr-4 hover:border-periwinkle/60 transition-colors"
          >
            {l.mark}
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold text-paper-raised">{l.name}</span>
              <span className="flex items-center gap-1 text-[13px] font-semibold text-periwinkle">
                <BadgeCheck size={14} aria-hidden="true" /> Verified
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
