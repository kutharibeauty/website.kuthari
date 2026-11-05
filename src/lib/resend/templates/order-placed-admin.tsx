import { Link, Section, Text } from '@react-email/components'
import type { OrderEmailData } from '../index'
import {
  AddressBlock, C, CTA, Divider, EmailShell, Facts, Hero, ItemList, Panel, SectionTitle, Totals, inr, istDate, paymentSummary,
} from './_kit'

type Props = OrderEmailData & { siteUrl: string }

export default function OrderPlacedAdmin({
  orderId, orderNumber, items, address, subtotal, deliveryFee, discount, couponCode, total, createdAt, siteUrl,
  transportDetails, notes, paymentMethod, amountPaid, gstin, gstBusinessName,
}: Props) {
  const pay = paymentSummary(paymentMethod, total, amountPaid)
  const due = Math.max(0, total - Number(amountPaid ?? 0))
  const pieces = items.reduce((n, i) => n + i.quantity, 0)

  return (
    <EmailShell siteUrl={siteUrl} audience="staff" preview={`New order #${orderNumber} · ${inr(total)} · ${address.name} ${address.phone}`}>
      <Hero eyebrow="New order" title={inr(total)} accent={`${items.length} product${items.length === 1 ? '' : 's'}, ${pieces} in all`}>
        From <strong>{address.name}</strong>, {address.city}. Confirm it so the customer gets a delivery date.
      </Hero>

      <CTA href={`${siteUrl}/admin/orders/${orderId}`}>Review &amp; confirm</CTA>

      <Facts items={[
        { label: 'Order', value: `#${orderNumber}` },
        { label: 'Placed', value: istDate(createdAt, true) },
        { label: 'Payment', value: pay.label },
      ]} />

      {paymentMethod !== 'online' && due > 0 && (
        <Panel label="Collect on delivery" tone="warn"><strong>{inr(due)}</strong> in cash.</Panel>
      )}

      <Section style={{ margin: '0 0 22px' }}>
        <Text style={{ margin: '0 0 4px', fontSize: '10px', letterSpacing: '1.5px', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const }}>Customer</Text>
        <Text style={{ margin: 0, fontSize: '15px', color: C.text }}>
          <strong>{address.name}</strong>&nbsp;&nbsp;
          <Link href={`tel:${address.phone}`} style={{ color: C.ink, fontWeight: 700 }}>{address.phone}</Link>
          &nbsp;&nbsp;
          <Link href={`https://wa.me/${address.phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`} style={{ color: C.green, fontWeight: 700 }}>WhatsApp</Link>
        </Text>
        {gstin && (
          <Text style={{ margin: '6px 0 0', fontSize: '13px', color: C.muted }}>
            GST bill: {gstBusinessName ? `${gstBusinessName} · ` : ''}{gstin}
          </Text>
        )}
      </Section>

      {notes && <Panel label="Customer note">{notes}</Panel>}

      <SectionTitle>Items</SectionTitle>
      <ItemList items={items} />
      <Totals subtotal={subtotal} discount={discount} couponCode={couponCode} deliveryFee={deliveryFee} total={total} />

      <Divider />
      <AddressBlock address={address} transportDetails={transportDetails} />
    </EmailShell>
  )
}
