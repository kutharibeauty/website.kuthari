import Link from 'next/link'
import Marquee from '@/components/ui/Marquee'
import type { SiteAnnouncement } from '@/types/database.types'

interface Props {
  data: SiteAnnouncement | null
}

/** Store facts that hold on every page, set beside the admin's announcement. */
const STORE_LINES = [
  'One piece at retail price, a box at bulk price',
  'Secure online payment',
  'Delivery across India',
]

/** Admin text can carry emoji; the bar sets words only. */
function clean(text: string): string {
  return text.replace(/\p{Extended_Pictographic}|️/gu, '').replace(/\s+/g, ' ').trim()
}

/**
 * The navy ticker above the header. The admin's announcement (Banners & CMS)
 * leads; the store's standing facts follow. The admin colour fields are kept in
 * the data but the bar is always set in the brand navy.
 */
export default function AnnouncementBar({ data }: Props) {
  const lead = data?.text ? clean(data.text) : ''
  const lines = [lead, ...STORE_LINES].filter(Boolean)

  const bar = (
    <Marquee
      label={lines.join('. ')}
      items={lines}
      duration={38}
      className="bg-ink py-2.5 text-paper-raised"
      itemClassName="text-[13px] font-semibold"
      starClassName="h-3 w-3 text-periwinkle"
    />
  )

  return data?.link_url ? (
    <Link href={data.link_url} className="block focus-visible:outline-offset-[-3px]">
      {bar}
    </Link>
  ) : (
    bar
  )
}
