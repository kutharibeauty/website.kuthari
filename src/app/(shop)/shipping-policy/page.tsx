import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/legal/LegalPage'
import { getStoreContent } from '@/lib/data/store-content'

export const metadata: Metadata = {
  title: 'Shipping and delivery',
  description: 'Where Kuthari Beauty Store delivers, what delivery costs, and how to track an order.',
  alternates: { canonical: '/shipping-policy' },
}

export default async function ShippingPolicyPage() {
  const { contact, delivery } = await getStoreContent()
  const STORE = { name: 'Kuthari Beauty Store', address: contact.address, phones: contact.phones, email: contact.email, hours: contact.hours, updated: '4 November 2026' }
  const FREE_DELIVERY_MIN = delivery.freeDeliveryMin
  const MIN_ORDER_VALUE = delivery.minOrderValue
  return (
    <LegalPage
      title="Shipping and delivery"
      accent="from Sano Bazar to you."
      updated={STORE.updated}
      intro={
        <p>
          Every order is packed at our shop in Brahmapur and sent to the address you choose at checkout. Here is
          what it costs and how to follow it.
        </p>
      }
      sections={[
        {
          heading: 'Where we deliver',
          body: (
            <p>
              We deliver across India. Enter your pincode at the top of the site or at checkout to see whether we
              reach it and what delivery costs there.
            </p>
          ),
        },
        {
          heading: 'What delivery costs',
          body: (
            <>
              <p>
                Delivery is free on orders of ₹{FREE_DELIVERY_MIN.toLocaleString('en-IN')} or more. Below that, a
                delivery charge set for your pincode is added at checkout, and you see it before you pay.
              </p>
              <p>The smallest order we can take is ₹{MIN_ORDER_VALUE.toLocaleString('en-IN')}.</p>
            </>
          ),
        },
        {
          heading: 'When it ships',
          body: (
            <p>
              We pack orders during shop hours, {STORE.hours}. You get an email at each step: when we confirm your
              order, when it&apos;s packed, when it&apos;s out for delivery and when it&apos;s delivered.
            </p>
          ),
        },
        {
          heading: 'Tracking your order',
          body: (
            <p>
              Sign in and open <Link href="/orders">your orders</Link> to see where an order is, its timeline and its
              invoice.
            </p>
          ),
        },
        {
          heading: 'If no one is home',
          body: (
            <p>
              Our delivery partner will call the phone number on the address. If we can&apos;t deliver after trying,
              we&apos;ll contact you to arrange another time.
            </p>
          ),
        },
        {
          heading: 'Contact',
          body: (
            <p>
              Questions about a delivery: call {STORE.phones.join(' or ')}, or write to{' '}
              <a href={`mailto:${STORE.email}`}>{STORE.email}</a>.
            </p>
          ),
        },
      ]}
    />
  )
}
