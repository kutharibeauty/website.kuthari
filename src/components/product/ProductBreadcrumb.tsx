'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useT } from '@/hooks/useT'

interface BreadcrumbItem {
  label: string
  labelOr?: string | null
  href?: string
}

interface Props {
  items: BreadcrumbItem[]
}

export default function ProductBreadcrumb({ items }: Props) {
  const { tField } = useT()

  return (
    <nav aria-label="Breadcrumb" className="px-4 lg:px-0 mb-4">
      <ol className="flex items-center gap-1 flex-wrap font-body-md text-body-md text-on-surface-variant">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight size={14} className="text-on-surface-variant/50 flex-shrink-0" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-primary transition-colors"
              >
                {tField(item.label, item.labelOr)}
              </Link>
            ) : (
              <span className="font-label-sm text-label-sm text-primary">
                {tField(item.label, item.labelOr)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
