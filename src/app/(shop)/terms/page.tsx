import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/legal/LegalPage'
import { getStoreContent } from '@/lib/data/store-content'

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The terms for shopping at Kuthari Beauty Store: accounts, prices, payment, delivery and liability.',
  alternates: { canonical: '/terms' },
}

export default async function TermsPage() {
  const { contact } = await getStoreContent()
  const STORE = { name: 'Kuthari Beauty Store', address: contact.address, phones: contact.phones, email: contact.email, hours: contact.hours, updated: '5 November 2026' }
  return (
    <LegalPage
      title="Terms of use"
      accent="the fine print, short."
      updated={STORE.updated}
      intro={
        <p>
          These terms apply when you use this website or buy from {STORE.name}, {STORE.address}. By placing an order
          you agree to them.
        </p>
      }
      sections={[
        {
          heading: 'Your account',
          body: (
            <p>
              You sign in with your mobile number and a one-time code. Keep your phone secure; orders placed from your
              account are treated as yours. Give us a correct name, email and delivery address.
            </p>
          ),
        },
        {
          heading: 'Products and prices',
          body: (
            <>
              <p>
                Prices are in Indian rupees and include GST unless the product page says otherwise. Many products have
                a retail price for a single piece and a lower bulk price for a pack or box; the one you choose is the
                one you pay.
              </p>
              <p>
                Product photos are a guide, and packaging can change from the manufacturer. We check prices and stock
                with care, but if a price is plainly wrong or an item runs out, we&apos;ll tell you and cancel that item
                with a full refund.
              </p>
            </>
          ),
        },
        {
          heading: 'Orders and payment',
          body: (
            <p>
              You can pay online through Razorpay or, when the shop offers it, in cash on delivery. Bulk orders may pay
              part online and the rest in cash. An online order is placed once payment succeeds; we confirm every order
              shortly after. Coupons and referral codes follow the conditions shown with them, and only one can be
              used on an order.
            </p>
          ),
        },
        {
          heading: 'Delivery',
          body: (
            <p>
              Delivery areas, charges and tracking are described in our{' '}
              <Link href="/shipping-policy">shipping and delivery policy</Link>.
            </p>
          ),
        },
        {
          heading: 'Cancellations, replacements and refunds',
          body: (
            <p>
              See our <Link href="/refund-policy">cancellations, replacements and refunds policy</Link>. In short: you
              can cancel only until we confirm the order; online payments on cancelled orders are refunded; delivered
              orders aren&apos;t refunded, but items that arrive damaged, faulty or wrong are replaced or exchanged when
              reported within 48 hours with photos.
            </p>
          ),
        },
        {
          heading: 'Using products safely',
          body: (
            <p>
              Read the label and do a patch test before using a new skincare, haircare or colour product. Salon and
              professional products should be used as their makers direct. We sell products as their manufacturers
              supply them and aren&apos;t responsible for reactions to their ingredients.
            </p>
          ),
        },
        {
          heading: 'Liability',
          body: (
            <p>
              If something goes wrong with an order, the most we are responsible for is the amount you paid for it.
              Nothing in these terms takes away your rights under Indian consumer law.
            </p>
          ),
        },
        {
          heading: 'Changes and law',
          body: (
            <p>
              We may update these terms; the date at the top shows the latest version. These terms are governed by
              the laws of India, and disputes go to the courts of Brahmapur, Odisha.
            </p>
          ),
        },
        {
          heading: 'Contact',
          body: (
            <p>
              Call {STORE.phones.join(' or ')} ({STORE.hours}) or write to{' '}
              <a href={`mailto:${STORE.email}`}>{STORE.email}</a>.
            </p>
          ),
        },
      ]}
    />
  )
}
