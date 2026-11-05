import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react'
import { getStoreContent } from '@/lib/data/store-content'
import { WA_LINK } from '@/components/home/WhatsAppFAB'

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Call, WhatsApp, email or visit Kuthari Beauty Store at Sano Bazar, Brahmapur.',
  alternates: { canonical: '/contact' },
}

export default async function ContactPage() {
  const { contact } = await getStoreContent()
  const STORE = { name: 'Kuthari Beauty Store', address: contact.address, phones: contact.phones, email: contact.email, hours: contact.hours, updated: '4 November 2026' }
  const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Kuthari Beauty Store, ${STORE.address}`)}`
  const ways = [
    { Icon: null, title: 'WhatsApp', line: 'The quickest way to ask about an order', href: WA_LINK, cta: 'Message us', external: true },
    { Icon: Phone, title: 'Call', line: `${STORE.phones.join(' or ')}`, href: `tel:${STORE.phones[0].replace(/\s/g, '')}`, cta: 'Call the shop' },
    { Icon: Mail, title: 'Email', line: STORE.email, href: `mailto:${STORE.email}`, cta: 'Write to us' },
    { Icon: MapPin, title: 'Visit', line: STORE.address, href: MAP_LINK, cta: 'Open in Maps', external: true },
  ]

  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 md:px-10 pt-10 md:pt-16">
      <h1 className="display text-[clamp(2.75rem,1.8rem+4vw,6rem)]">Talk to the counter</h1>
      <p className="accent-line mt-1 text-[clamp(2.25rem,1.5rem+3.2vw,4.75rem)]">we&apos;re open {STORE.hours.split(',')[0].toLowerCase()}.</p>
      <p className="mt-6 max-w-[52ch] text-[18px] leading-relaxed text-ink/85">
        Shop hours are {STORE.hours}. Have your order number ready if your question is about an order.
      </p>

      <ul className="mt-12 grid gap-4 md:gap-5 sm:grid-cols-2">
        {ways.map(({ Icon, title, line, href, cta, external }) => (
          <li key={title}>
            <a
              href={href}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="group flex h-full flex-col justify-between gap-8 rounded-[var(--radius-card)] bg-periwinkle p-6 md:p-8 transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <span>
                {Icon ? (
                  <Icon size={28} strokeWidth={2} className="text-ink" aria-hidden="true" />
                ) : (
                  <Image src="/images/whatsapp.webp" alt="" width={36} height={36} className="h-9 w-9" />
                )}
                <span className="display mt-5 block text-[clamp(2rem,1.5rem+1.6vw,3rem)]">{title}</span>
                <span className="mt-2 block text-[17px] leading-relaxed text-ink/85">{line}</span>
              </span>
              <span className="inline-flex items-center gap-3 text-[16px] font-semibold text-ink">
                {cta}
                <span className="arrow-chip h-9 w-9 group-hover:translate-x-0.5">
                  <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
