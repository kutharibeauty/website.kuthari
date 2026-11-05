import type { OrderEmailData } from '../index'
import {
  AddressBlock, CTA, Divider, EmailShell, Facts, Hero, ItemList, Panel, Progress, SectionTitle, Totals,
  istDate, paymentSummary,
} from './_kit'

type Props = OrderEmailData & { siteUrl: string }

export default function OrderConfirmedCustomer({
  orderId, orderNumber, items, address, subtotal, deliveryFee, discount, couponCode, total,
  createdAt, estimatedDelivery, customMessage, confirmedByName, siteUrl, transportDetails,
  paymentMethod, amountPaid,
}: Props) {
  const pay = paymentSummary(paymentMethod, total, amountPaid)
  const firstName = (address.name || '').split(' ')[0]

  return (
    <EmailShell
      siteUrl={siteUrl}
      preview={`Order #${orderNumber} is confirmed${estimatedDelivery ? `. Expected ${estimatedDelivery}` : ''}. Your invoice is attached.`}
    >
      <Hero eyebrow="Order confirmed" title="It's confirmed" accent="We're packing it with care." tone="good">
        Good news{firstName ? `, ${firstName}` : ''}. Order <strong>#{orderNumber}</strong> is confirmed and being prepared.
      </Hero>

      <Progress status="confirmed" />

      {estimatedDelivery && (
        <Panel label="Expected delivery" tone="good"><strong>{estimatedDelivery}</strong></Panel>
      )}

      {customMessage && (
        <Panel label="A note from the shop">
          &ldquo;{customMessage}&rdquo;{confirmedByName ? <><br /><span style={{ fontSize: '13px' }}>— {confirmedByName}</span></> : null}
        </Panel>
      )}

      <Facts items={[
        { label: 'Order', value: `#${orderNumber}` },
        { label: 'Placed', value: istDate(createdAt) },
        { label: 'Payment', value: pay.label },
      ]} />

      <SectionTitle>Order summary</SectionTitle>
      <ItemList items={items} />
      <Totals subtotal={subtotal} discount={discount} couponCode={couponCode} deliveryFee={deliveryFee} total={total} />

      <Panel label="Payment">{pay.note}</Panel>
      <Panel label="Invoice">Your invoice is attached to this email as a PDF.</Panel>

      <Divider />
      <AddressBlock address={address} transportDetails={transportDetails} />

      <CTA href={`${siteUrl}/orders/${orderId}`}>Track your order</CTA>
    </EmailShell>
  )
}
