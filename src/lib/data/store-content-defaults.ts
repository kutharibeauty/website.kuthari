import { parseDeliveryConfig, type DeliveryConfig } from '@/lib/cart/delivery'

/**
 * Everything on the storefront that the admin edits in Banners & CMS
 * (Homepage and Footer tabs) and Settings, read once and cached under the
 * 'shop-chrome' tag. Admin saves refresh that tag (lib/revalidate.ts).
 *
 * Every field falls back to the store's current copy, so an empty or partial
 * CMS row never blanks the site.
 */
export interface StoreContent {
  hero: { title: string; accent: string; subtitle: string }
  stats: { headline: string; accent: string; blurb: string; items: { value: string; label: string }[] }
  contact: { phones: string[]; email: string; address: string; hours: string; tagline: string }
  social: { instagram: string; facebook: string; youtube: string; whatsapp: string }
  delivery: DeliveryConfig
}

export const DEFAULT_CONTENT: StoreContent = {
  hero: {
    title: 'The beauty counter,',
    accent: 'at your door.',
    subtitle: 'Skincare, haircare and salon stock from our Brahmapur shop, sent across India.',
  },
  // No figures until the owner enters real ones in Banners & CMS → Homepage.
  stats: {
    headline: 'From our counter',
    accent: 'to your door.',
    blurb: 'Retail and bulk, from one shop in Sano Bazar, Brahmapur. Now packed and sent across India.',
    items: [],
  },
  contact: {
    phones: ['+91 98612 35276'],
    email: 'smortika@gmail.com',
    address: 'Marthapeta St, near Sano Bazar, Triveni Nagar, Brahmapur, Odisha 760009',
    hours: 'Monday to Saturday, 9 am to 6 pm',
    tagline: 'Your beauty counter in Brahmapur, delivering across India',
  },
  social: {
    instagram: 'https://www.instagram.com/k_beauty_store923/',
    facebook: '',
    youtube: '',
    whatsapp: '',
  },
  delivery: parseDeliveryConfig(null),
}
