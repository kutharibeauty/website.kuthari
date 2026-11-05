import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { parseDeliveryConfig } from '@/lib/cart/delivery'

import { DEFAULT_CONTENT, type StoreContent } from './store-content-defaults'

export { DEFAULT_CONTENT, type StoreContent }

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const text = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback)

export const getStoreContent = unstable_cache(
  async (): Promise<StoreContent> => {
    try {
      const { data } = await createAdminClient()
        .from('cms_content')
        .select('key, value')
        .in('key', ['hero', 'store_stats', 'footer', 'social_links', 'settings', 'footer_links'])
      const cms: Record<string, unknown> = {}
      for (const row of (data ?? []) as { key: string; value: unknown }[]) cms[row.key] = row.value

      const hero = obj(cms.hero)
      const stats = obj(cms.store_stats)
      const footer = obj(cms.footer)
      const social = obj(cms.social_links)
      const d = DEFAULT_CONTENT

      const statItems = Array.isArray(stats.items)
        ? (stats.items as unknown[])
            .map((i) => obj(i))
            .filter((i) => typeof i.value === 'string' && i.value.trim())
            .map((i) => ({ value: String(i.value).trim(), label: text(i.label, '') }))
            .slice(0, 4)
        : []

      const phones = text(footer.phone, '')
        .split(/[,/]| or /)
        .map((p) => p.trim())
        .filter(Boolean)

      return {
        hero: {
          title: text(hero.title_en, d.hero.title),
          accent: text(hero.accent_en, d.hero.accent),
          subtitle: text(hero.subtitle_en, d.hero.subtitle),
        },
        stats: {
          headline: text(stats.headline, d.stats.headline),
          accent: text(stats.accent, d.stats.accent),
          blurb: text(stats.blurb, d.stats.blurb),
          items: statItems.length ? statItems : d.stats.items,
        },
        contact: {
          phones: phones.length ? phones : d.contact.phones,
          email: text(footer.email, d.contact.email),
          address: text(footer.address, d.contact.address),
          hours: text(footer.hours, d.contact.hours),
          tagline: text(footer.tagline_en, d.contact.tagline),
        },
        social: {
          instagram: text(social.instagram, d.social.instagram),
          facebook: text(social.facebook, ''),
          youtube: text(social.youtube, ''),
          whatsapp: text(social.whatsapp, ''),
        },
        links: (Array.isArray(cms.footer_links) ? (cms.footer_links as unknown[]) : [])
          .map((l) => obj(l))
          .map((l) => ({ label: text(l.label, ''), href: text(l.href, '') }))
          // Site paths or http(s) links only.
          .filter((l) => l.label && (/^\/[^/]/.test(l.href) || /^https?:\/\//.test(l.href)))
          .slice(0, 8),
        delivery: parseDeliveryConfig(cms.settings),
      }
    } catch {
      return DEFAULT_CONTENT
    }
  },
  ['store-content'],
  { revalidate: 300, tags: ['shop-chrome'] },
)
