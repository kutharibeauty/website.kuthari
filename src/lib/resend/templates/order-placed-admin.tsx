import {
  Body, Container, Head, Heading, Hr, Html,
  Preview, Section, Text, Row, Column, Link, Button,
} from '@react-email/components'
import type { OrderEmailData } from '../index'

type Props = OrderEmailData & { siteUrl: string }

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function OrderPlacedAdmin({
  orderId, orderNumber, items, address, subtotal, deliveryFee, discount, couponCode, total, createdAt, siteUrl,
}: Props) {
  const date = new Date(createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    // Emails render on the server (UTC); pin to IST or the time is off by 5:30.
    timeZone: 'Asia/Kolkata',
  })

  return (
    <Html lang="en">
      <Head />
      <Preview>🛒 New Order #{orderNumber} · ₹{total.toLocaleString('en-IN')} · {address.phone}</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Alert header */}
          <Section style={alertHeader}>
            <Text style={alertIcon}>🛒</Text>
            <Heading style={alertTitle}>New Order Received</Heading>
            <Text style={alertSub}>Action required: Review and confirm this order</Text>
          </Section>

          {/* Quick stats */}
          <Section style={statsRow}>
            <Row>
              <Column style={statCol}>
                <Text style={statLabel}>ORDER #</Text>
                <Text style={statValue}>#{orderNumber}</Text>
              </Column>
              <Column style={statCol}>
                <Text style={statLabel}>TOTAL</Text>
                <Text style={{ ...statValue, color: '#292966' }}>{fmt(total)}</Text>
              </Column>
              <Column style={statCol}>
                <Text style={statLabel}>DATE</Text>
                <Text style={statValue}>{date}</Text>
              </Column>
            </Row>
          </Section>

          {/* CTA button */}
          <Section style={ctaSection}>
            <Button href={`${siteUrl}/admin/orders/${orderId}`} style={ctaButton}>
              View &amp; Confirm Order →
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Customer */}
          <Section style={section}>
            <Heading style={sectionTitle}>Customer Details</Heading>
            <Row>
              <Column>
                <Text style={metaLabel}>NAME</Text>
                <Text style={metaValue}>{address.name}</Text>
              </Column>
              <Column>
                <Text style={metaLabel}>PHONE</Text>
                <Link href={`tel:${address.phone}`} style={phoneLink}>{address.phone}</Link>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Items table */}
          <Section style={section}>
            <Heading style={sectionTitle}>Order Items</Heading>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f7f7fc' }}>
                  <th style={th}>Product</th>
                  <th style={{ ...th, textAlign: 'center' }}>Qty</th>
                  <th style={{ ...th, textAlign: 'right' }}>Unit Price</th>
                  <th style={{ ...th, textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e5e1d9' }}>
                    <td style={td}>
                      <Text style={itemName}>{item.name}</Text>
                      <Text style={itemUnit}>{item.unit}</Text>
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <Text style={tdText}>{item.quantity}</Text>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <Text style={tdText}>{fmt(item.price)}</Text>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <Text style={{ ...tdText, fontWeight: '600' }}>{fmt(item.price * item.quantity)}</Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <table style={{ width: '240px', marginLeft: 'auto', marginTop: '12px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={totalLbl}>Subtotal</td>
                  <td style={totalVal}>{fmt(subtotal)}</td>
                </tr>
                {(discount ?? 0) > 0 && (
                  <tr>
                    <td style={totalLbl}>Discount{couponCode ? ` (${couponCode})` : ''}</td>
                    <td style={{ ...totalVal, color: '#16a34a' }}>−{fmt(discount!)}</td>
                  </tr>
                )}
                <tr>
                  <td style={totalLbl}>Delivery</td>
                  <td style={totalVal}>{deliveryFee === 0 ? 'FREE' : fmt(deliveryFee)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #292966' }}>
                  <td style={{ ...totalLbl, fontWeight: '700', color: '#292966', fontSize: '15px', paddingTop: '8px' }}>Grand Total</td>
                  <td style={{ ...totalVal, fontWeight: '700', color: '#292966', fontSize: '15px', paddingTop: '8px' }}>{fmt(total)}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={divider} />

          {/* Delivery address */}
          <Section style={section}>
            <Heading style={sectionTitle}>Delivery Address</Heading>
            <Text style={addrText}>
              {address.name}<br />
              {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
              {address.city}, {address.state} — {address.pincode}<br />
              {address.phone}
            </Text>
          </Section>

          <Section style={ctaSection}>
            <Button href={`${siteUrl}/admin/orders/${orderId}`} style={ctaButton}>
              View &amp; Confirm Order →
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Kuthari Beauty Store Admin Panel · This is an automated notification
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#eeeef8', fontFamily: 'Helvetica, Arial, sans-serif', margin: '0', padding: '20px 0' }
const container = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const }
const alertHeader = { backgroundColor: '#c2410c', padding: '28px 32px', textAlign: 'center' as const }
const alertIcon = { fontSize: '40px', margin: '0 0 4px' }
const alertTitle = { color: '#ffffff', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }
const alertSub = { color: '#fed7aa', fontSize: '14px', margin: '0' }
const statsRow = { backgroundColor: '#f7f7fc', padding: '20px 32px' }
const statCol = { padding: '0 12px', textAlign: 'center' as const }
const statLabel = { color: '#81756e', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, margin: '0 0 4px' }
const statValue = { color: '#1c1c17', fontSize: '18px', fontWeight: '700', margin: '0' }
const ctaSection = { padding: '20px 32px', textAlign: 'center' as const }
const ctaButton = { backgroundColor: '#292966', color: '#f7f7fc', borderRadius: '24px', padding: '14px 32px', fontSize: '15px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }
const divider = { borderColor: '#e5e1d9', margin: '0' }
const section = { padding: '24px 32px' }
const sectionTitle = { color: '#292966', fontSize: '15px', fontWeight: '700', margin: '0 0 16px', letterSpacing: '0.5px', textTransform: 'uppercase' as const }
const metaLabel = { color: '#81756e', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const, margin: '0 0 4px' }
const metaValue = { color: '#1c1c17', fontSize: '15px', fontWeight: '600', margin: '0' }
const phoneLink = { color: '#292966', fontSize: '15px', fontWeight: '600' }
const th = { padding: '8px 10px', textAlign: 'left' as const, fontSize: '11px', letterSpacing: '0.5px', color: '#4f453f', fontWeight: '600', textTransform: 'uppercase' as const }
const td = { padding: '10px', verticalAlign: 'top' as const }
const tdText = { color: '#1c1c17', fontSize: '14px', margin: '0' }
const itemName = { color: '#1c1c17', fontSize: '14px', fontWeight: '600', margin: '0 0 2px' }
const itemUnit = { color: '#81756e', fontSize: '12px', margin: '0' }
const totalLbl = { padding: '4px 0', color: '#4f453f', fontSize: '13px' }
const totalVal = { padding: '4px 0', textAlign: 'right' as const, color: '#1c1c17', fontSize: '13px' }
const addrText = { color: '#3d2b1f', fontSize: '14px', lineHeight: '1.7', margin: '0' }
const footer = { backgroundColor: '#eeeef8', padding: '20px 32px', textAlign: 'center' as const }
const footerText = { color: '#81756e', fontSize: '12px', margin: '0' }
