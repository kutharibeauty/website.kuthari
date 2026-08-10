import type { Metadata, Viewport } from 'next'
import { Poppins, Playfair_Display } from 'next/font/google'
import { MASTER_KEYWORDS } from '@/lib/seo/keywords'
import AuthTokenCatcher from '@/components/auth/AuthTokenCatcher'
import AdminShortcut from '@/components/auth/AdminShortcut'
import SessionKeepAlive from '@/components/auth/SessionKeepAlive'
import './globals.css'

// TODO(Phase 2): replace with the real production domain once confirmed.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kutharibeauty.com'
const OG_IMAGE = '/og-image.jpg'

// Main site font
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
})

// Heading / sub-heading font — elegant high-contrast serif
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'KUTHARI BEAUTY STORE — Wholesale Cosmetics, Salon & Grooming Supplies',
    template: '%s | KUTHARI BEAUTY STORE',
  },
  // Placeholder copy — refine with the client's real coverage area/positioning in Phase 2.
  description:
    'Kuthari Beauty Store is a trusted wholesale distributor of cosmetics, skincare, haircare, salon and grooming products. Buy in bulk at wholesale prices. Order online with secure payment.',
  // TODO(Phase 2): MASTER_KEYWORDS still lists grocery/commodity terms — replace with
  // real cosmetics/salon/grooming SEO keywords once the client confirms brands/categories.
  keywords: [
    ...MASTER_KEYWORDS.brand,
    ...MASTER_KEYWORDS.wholesale,
    ...MASTER_KEYWORDS.cities.slice(0, 6),
    ...MASTER_KEYWORDS.nearMe.slice(0, 4),
    ...MASTER_KEYWORDS.longTail.slice(0, 6),
  ],
  authors: [{ name: 'KUTHARI BEAUTY STORE', url: APP_URL }],
  creator: 'KUTHARI BEAUTY STORE',
  publisher: 'KUTHARI BEAUTY STORE',
  applicationName: 'KUTHARI BEAUTY STORE',
  category: 'shopping',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Kuthari Beauty Store', statusBarStyle: 'default' },
  formatDetection: { telephone: true, address: true, email: true },
  alternates: { canonical: APP_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Set GOOGLE_SITE_VERIFICATION and BING_SITE_VERIFICATION in .env after search console setup
  ...((process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION) && {
    verification: {
      ...(process.env.GOOGLE_SITE_VERIFICATION && { google: process.env.GOOGLE_SITE_VERIFICATION }),
      ...(process.env.BING_SITE_VERIFICATION && { other: { 'msvalidate.01': [process.env.BING_SITE_VERIFICATION] } }),
    },
  }),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: APP_URL,
    siteName: 'KUTHARI BEAUTY STORE',
    title: 'KUTHARI BEAUTY STORE — Wholesale Cosmetics & Salon Supplies Distributor',
    description:
      'Wholesale prices on skincare, haircare, makeup, salon and grooming products. Secure online payment.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Kuthari Beauty Store — Wholesale Cosmetics & Salon Supplies' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KUTHARI BEAUTY STORE — Wholesale Cosmetics & Salon Supplies Distributor',
    description: 'Wholesale prices on skincare, haircare, makeup, salon and grooming products. Secure online payment.',
    images: [OG_IMAGE],
  },
}

export const viewport: Viewport = {
  themeColor: '#1b2c3d',
  width: 'device-width',
  initialScale: 1,
  // Required for env(safe-area-inset-*) to return real values on iPhone.
  // Without it those insets are 0, so the bottom nav / sticky bars / sheets sit
  // under the notch and home indicator. No effect on desktop/Android (insets 0).
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${playfair.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Odia:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <AuthTokenCatcher />
        <AdminShortcut />
        <SessionKeepAlive />
        {children}
      </body>
    </html>
  )
}
