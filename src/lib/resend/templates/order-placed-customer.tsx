import type { OrderEmailData } from '../index'
import {
  AddressBlock, CTA, Divider, EmailShell, Facts, Hero, ItemList, Panel, SectionTitle, Totals, istDate, paymentSummary,
} from './_kit'

type Props = OrderEmailData & { siteUrl: string }

export default function OrderPlacedCustomer({
  orderId, orderNumber, items, address, subtotal, deliveryFee, discount, couponCode, total, createdAt, siteUrl,
  transportDetails, paymentMethod, amountPaid,
}: Props) {
  const pay = paymentSummary(paymentMethod, total, amountPaid)
  const firstName = (address.name || '').split(' ')[0]

  return (
    <EmailShell siteUrl={siteUrl} preview={`We've got your order #${orderNumber}. We'll confirm it shortly.`}>
      <Hero eyebrow="Order received" title={`Thank you${firstName ? `, ${firstName}` : ''}`} accent="Your order is in.">
        We&apos;ve received order <strong>#{orderNumber}</strong>. The shop will check stock and confirm it soon, and
        you&apos;ll get another email with the delivery date.
      </Hero>

      <Facts items={[
        { label: 'Order', value: `#${orderNumber}` },
        { label: 'Placed', value: istDate(createdAt, true) },
        { label: 'Payment', value: pay.label },
      ]} />

      <SectionTitle>Your items</SectionTitle>
      <ItemList items={items} />
      <Totals subtotal={subtotal} discount={discount} couponCode={couponCode} deliveryFee={deliveryFee} total={total} />

      <Panel label="Payment">{pay.note}</Panel>

      <Divider />
      <AddressBlock address={address} transportDetails={transportDetails} />

      <CTA href={`${siteUrl}/orders/${orderId}`}>Track your order</CTA>
    </EmailShell>
  )
}
