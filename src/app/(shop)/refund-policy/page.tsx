import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/legal/LegalPage'
import { getStoreContent } from '@/lib/data/store-content'
import { ISSUE_REASONS, ISSUE_WINDOW_HOURS } from '@/lib/orders/issues'

export const metadata: Metadata = {
  title: 'Cancellations, replacements and refunds',
  description: `Cancel a Kuthari Beauty Store order before we confirm it. Items that arrive damaged, faulty or wrong are replaced or exchanged when reported within ${ISSUE_WINDOW_HOURS} hours.`,
  alternates: { canonical: '/refund-policy' },
}

export default async function RefundPolicyPage() {
  const { contact } = await getStoreContent()
  const STORE = { name: 'Kuthari Beauty Store', address: contact.address, phones: contact.phones, email: contact.email, hours: contact.hours, updated: '5 November 2026' }
  return (
    <LegalPage
      title="Cancellations, replacements and refunds"
      accent="plainly."
      updated={STORE.updated}
      intro={
        <p>
          You can cancel an order until we confirm it. After delivery we don&apos;t take returns or give money back,
          but if something arrives damaged, faulty or wrong, report it within {ISSUE_WINDOW_HOURS} hours and we&apos;ll
          replace it or exchange it.
        </p>
      }
      sections={[
        {
          heading: 'Cancelling an order',
          body: (
            <>
              <p>
                You can cancel an order yourself from <Link href="/orders">your orders</Link> while its status is
                still <strong>Placed</strong>. Once we confirm it, we start packing it, and it can no longer be
                cancelled by you, online or by phone.
              </p>
              <p>Orders billed with a GST invoice can&apos;t be cancelled once placed.</p>
            </>
          ),
        },
        {
          heading: 'Refunds on cancelled orders',
          body: (
            <>
              <p>
                If you paid online and the order is cancelled, by you before confirmation or by us (for example, when an
                item runs out), we refund what you paid online automatically, in full, to the same card, UPI account or
                bank. Many UPI and card refunds arrive within minutes; others take 5 to 7 working days to show on your
                statement.
              </p>
              <p>For a cash on delivery order nothing has been paid, so there is nothing to refund.</p>
              <p>
                This is the only time money is refunded. We don&apos;t refund delivered orders. A problem with a
                delivered item is put right with a replacement or exchange, as below.
              </p>
            </>
          ),
        },
        {
          heading: `Damaged, faulty or wrong items: report within ${ISSUE_WINDOW_HOURS} hours`,
          body: (
            <>
              <p>We put these right with a replacement or an exchange:</p>
              <ul>
                {Object.values(ISSUE_REASONS).map((r) => <li key={r}>{r}</li>)}
              </ul>
              <p>How to report it:</p>
              <ol>
                <li>Open the order in <Link href="/orders">your orders</Link> and tap <strong>Report a problem</strong>. The button stays there for {ISSUE_WINDOW_HOURS} hours after delivery.</li>
                <li>Pick the item, say what went wrong, and add clear photos of the item and its outer box or packet (up to five). Photos aren&apos;t needed for a missing item.</li>
                <li>Choose a replacement of the same item or an exchange for another product.</li>
              </ol>
              <p>
                We email you as soon as we receive it, and again when we&apos;ve reviewed it, usually within a day. If we
                approve it, we arrange the replacement or exchange and send it at no extra cost. If we can&apos;t approve
                it, we tell you why.
              </p>
              <p>
                Please keep the product and all its packaging until the request is settled; we may need to collect the
                damaged item. An exchange is for a product of the same value. If you choose something that costs more,
                you pay the difference.
              </p>
            </>
          ),
        },
        {
          heading: 'What we can’t replace',
          body: (
            <ul>
              <li>Items reported more than {ISSUE_WINDOW_HOURS} hours after delivery.</li>
              <li>Products that arrived in good condition but were opened, used, or are no longer wanted.</li>
              <li>A shade, fragrance or texture that isn&apos;t to your liking, when it matches what you ordered.</li>
              <li>Damage caused after delivery, or a request without photos where photos were needed.</li>
            </ul>
          ),
        },
        {
          heading: 'Delivery charges',
          body: (
            <p>
              On a cancelled online order, any delivery charge you paid is refunded with it. Replacements and exchanges
              we approve are delivered free.
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
