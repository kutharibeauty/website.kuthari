import type { OrderEmailData } from '../index'
import {
  CTA, EmailShell, Facts, Hero, ItemList, Panel, Progress, ReviewNudge, SectionTitle, Totals, inr, istDate, paymentSummary,
} from './_kit'

type Props = OrderEmailData & { siteUrl: string }

type Tone = 'brand' | 'good' | 'bad' | 'warn'
const COPY: Record<string, { eyebrow: string; title: string; accent: string; lead: string; tone: Tone }> = {
  confirmed:        { eyebrow: 'Order confirmed',  title: "It's confirmed",       accent: "We're packing it with care.",   lead: 'Your order is confirmed and being prepared.', tone: 'good' },
  packed:           { eyebrow: 'Packed',           title: 'All packed',           accent: 'Ready to leave the shop.',      lead: 'Your order is packed and will be on its way soon.', tone: 'brand' },
  shipping:         { eyebrow: 'On the way',       title: 'Out for delivery',     accent: 'Your order is on its way.',     lead: 'Our delivery partner has your order and is heading to you.', tone: 'brand' },
  out_for_delivery: { eyebrow: 'On the way',       title: 'Out for delivery',     accent: 'Your order is on its way.',     lead: 'Our delivery partner has your order and is heading to you.', tone: 'brand' },
  delivered:        { eyebrow: 'Delivered',        title: 'Delivered',            accent: 'We hope you love it.',          lead: 'Your order has been delivered. Thank you for shopping with us.', tone: 'good' },
  cancelled:        { eyebrow: 'Order cancelled',  title: 'Order cancelled',      accent: "We're sorry it didn't work out.", lead: 'This order has been cancelled. If you paid online, the refund goes back to the same account.', tone: 'bad' },
  returned:         { eyebrow: 'Order returned',   title: 'Order returned',       accent: 'Your return is recorded.',      lead: 'This order has been marked as returned.', tone: 'warn' },
}

export default function OrderStatusUpdate({
  orderNumber, orderId, items, subtotal, deliveryFee, discount, couponCode, total, createdAt,
  status = 'confirmed', estimatedDelivery, customMessage, siteUrl, paymentMethod, amountPaid,
}: Props) {
  const copy = COPY[status] ?? COPY.confirmed
  const live = status !== 'delivered' && status !== 'cancelled' && status !== 'returned'
  const pay = paymentSummary(paymentMethod, total, amountPaid)
  const due = Math.max(0, total - Number(amountPaid ?? 0))
  const collectOnDelivery = live && (status === 'shipping' || status === 'out_for_delivery') && paymentMethod !== 'online' && due > 0

  return (
    <EmailShell siteUrl={siteUrl} preview={`${copy.title}: order #${orderNumber}. ${copy.accent}`}>
      <Hero eyebrow={copy.eyebrow} title={copy.title} accent={copy.accent} tone={copy.tone}>
        {copy.lead}
      </Hero>

      <Progress status={status} />

      {customMessage && <Panel label="A note from the shop">&ldquo;{customMessage}&rdquo;</Panel>}

      {estimatedDelivery && live && (
        <Panel label="Expected delivery" tone="good"><strong>{estimatedDelivery}</strong></Panel>
      )}

      {collectOnDelivery && (
        <Panel label="Keep cash ready" tone="warn">Please keep <strong>{inr(due)}</strong> ready for the delivery partner.</Panel>
      )}

      <Facts items={[
        { label: 'Order', value: `#${orderNumber}` },
        { label: 'Placed', value: istDate(createdAt) },
        { label: 'Payment', value: pay.label },
      ]} />

      <SectionTitle>Order summary</SectionTitle>
      <ItemList items={items} />
      <Totals subtotal={subtotal} discount={discount} couponCode={couponCode} deliveryFee={deliveryFee} total={total} />

      {status === 'delivered' && (
        <>
          <Panel label="Invoice">Your invoice is attached to this email as a PDF.</Panel>
          <ReviewNudge />
        </>
      )}

      <CTA href={`${siteUrl}/orders/${orderId}`}>{status === 'delivered' ? 'View order' : 'Track your order'}</CTA>
    </EmailShell>
  )
}
