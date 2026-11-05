import type { Metadata, Viewport } from 'next'
import { Anton, Fraunces, Familjen_Grotesk } from 'next/font/google'
import { MASTER_KEYWORDS } from '@/lib/seo/keywords'
import AuthTokenCatcher from '@/components/auth/AuthTokenCatcher'
import AdminShortcut from '@/components/auth/AdminShortcut'
import SessionKeepAlive from '@/components/auth/SessionKeepAlive'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kutharibeauty.com'
const OG_IMAGE = '/og-image.jpg'

// Body and every functional heading.
const familjen = Familjen_Grotesk({
  subsets: ['latin'],
  variable: '--font-familjen',
  display: 'swap',
})

// Display: statement heads, always uppercase.
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
})

// Accent line under a display head, set in italic.
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'KUTHARI BEAUTY STORE — Cosmetics, Skincare, Haircare & Salon Products',
    template: '%s | KUTHARI BEAUTY STORE',
  },
  description:
    'Kuthari Beauty Store is your trusted store for cosmetics, skincare, haircare, salon and grooming products. Buy a single piece at retail price or order in bulk. Secure online payment, delivery across India.',
  keywords: [
    ...MASTER_KEYWORDS.brand,
    ...MASTER_KEYWORDS.retail,
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
    title: 'KUTHARI BEAUTY STORE — Cosmetics, Skincare & Salon Products Online',
    description:
      'Skincare, haircare, makeup, salon and grooming products. Retail or bulk. Secure online payment.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Kuthari Beauty Store — Cosmetics, Skincare & Salon Products' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KUTHARI BEAUTY STORE — Cosmetics, Skincare & Salon Products Online',
    description: 'Skincare, haircare, makeup, salon and grooming products. Retail or bulk. Secure online payment.',
    images: [OG_IMAGE],
  },
}

export const viewport: Viewport = {
  themeColor: '#f3f2ee',
  width: 'device-width',
  initialScale: 1,
  // Required for env(safe-area-inset-*) to return real values on iPhone.
  // Without it those insets are 0, so the bottom nav / sticky bars / sheets sit
  // under the notch and home indicator. No effect on desktop/Android (insets 0).
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${familjen.variable} ${anton.variable} ${fraunces.variable}`}>
      <body>
        <AuthTokenCatcher />
        <AdminShortcut />
        <SessionKeepAlive />
        {children}
      </body>
    </html>
  )
}
