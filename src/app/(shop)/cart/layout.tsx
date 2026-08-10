import type { Metadata } from 'next'

// The cart page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: 'Your Cart — Kuthari Beauty Store',
  description: 'Review the items in your Kuthari Beauty Store cart, apply coupons and proceed to a fast, secure checkout.',
  robots: { index: false, follow: true },
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
