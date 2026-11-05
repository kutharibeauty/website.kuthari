import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/legal/LegalPage'
import { getStoreContent } from '@/lib/data/store-content'

export const metadata: Metadata = {
  title: 'Cancellations and refunds',
  description: 'How to cancel a Kuthari Beauty Store order, when refunds are made, and what to do if an item arrives damaged.',
  alternates: { canonical: '/refund-policy' },
}

export default async function RefundPolicyPage() {
  const { contact, delivery } = await getStoreContent()
  const STORE = { name: 'Kuthari Beauty Store', address: contact.address, phones: contact.phones, email: contact.email, hours: contact.hours, updated: '4 November 2026' }
  const FREE_DELIVERY_MIN = delivery.freeDeliveryMin
  return (
    <LegalPage
      title="Cancellations and refunds"
      accent="plainly."
      updated={STORE.updated}
      intro={
        <p>
          Beauty and personal-care products can&apos;t be resold once they leave the shop, so we don&apos;t take
          returns or exchanges. You can still cancel before we confirm your order, and we put things right when an
          order arrives damaged or wrong.
        </p>
      }
      sections={[
        {
          heading: 'Cancelling an order',
          body: (
            <>
              <p>
                You can cancel an order yourself from <Link href="/orders">your orders</Link> while its status is
                still <strong>Placed</strong>, before we confirm it. Once it&apos;s confirmed, packing has begun and the
                cancel button goes away; call or WhatsApp us and we&apos;ll do what we can.
              </p>
              <p>Orders with a GST invoice can&apos;t be cancelled online. Contact us to change one.</p>
            </>
          ),
        },
        {
          heading: 'Refunds on cancelled orders',
          body: (
            <p>
              Every order is paid online through Razorpay. When an order is cancelled, we refund the full amount you
              paid to the same card, UPI account or bank you paid from. Razorpay usually takes 5 to 7 working days to
              show it on your statement.
            </p>
          ),
        },
        {
          heading: 'Returns and exchanges',
          body: (
            <p>
              We don&apos;t accept returns or exchanges of products that have been delivered in good condition,
              opened or unopened.
            </p>
          ),
        },
        {
          heading: 'Damaged, missing or wrong items',
          body: (
            <>
              <p>
                If something arrives damaged, leaking, missing or not what you ordered, tell us within 48 hours of
                delivery. Send your order number and a photo of the item and its packaging to {STORE.phones[0]} on
                WhatsApp or to <a href={`mailto:${STORE.email}`}>{STORE.email}</a>.
              </p>
              <p>Once we&apos;ve checked it, we&apos;ll send a replacement or refund that item to your original payment method.</p>
            </>
          ),
        },
        {
          heading: 'Delivery charges',
          body: (
            <p>
              Delivery is free on orders of ₹{FREE_DELIVERY_MIN.toLocaleString('en-IN')} or more. Below that, the
              charge shown at checkout is refunded along with the order when we cancel it or can&apos;t deliver it.
            </p>
          ),
        },
        {
          heading: 'Contact',
          body: (
            <p>
              {STORE.name}, {STORE.address}. Call {STORE.phones.join(' or ')} ({STORE.hours}), or write to{' '}
              <a href={`mailto:${STORE.email}`}>{STORE.email}</a>.
            </p>
          ),
        },
      ]}
    />
  )
}
