import Link from 'next/link'
import type { SiteAnnouncement } from '@/types/database.types'

interface Props {
  data: SiteAnnouncement
}

export default function AnnouncementBar({ data }: Props) {
  const content = (
    <p className="text-sm font-medium leading-snug px-4">{data.text}</p>
  )

  return (
    <div
      style={{ backgroundColor: data.background_color, color: data.text_color }}
      className="w-full text-center py-2.5"
    >
      {data.link_url ? (
        <Link href={data.link_url} className="hover:underline">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  )
}
