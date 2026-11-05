import {
  Body, Container, Head, Heading, Hr, Html, Img,
  Preview, Section, Text, Row, Column, Link,
} from '@react-email/components'
import type { OrderEmailData } from '../index'

type Props = OrderEmailData & { siteUrl: string }

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function OrderPlacedCustomer({
  orderNumber, items, address, subtotal, deliveryFee, discount, couponCode, total, createdAt, siteUrl,
  transportDetails, paymentMethod, amountPaid,
}: Props) {
  const date = new Date(createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    // Emails render on the server (UTC); pin to IST or the time is off by 5:30.
    timeZone: 'Asia/Kolkata',
  })

  return (
    <Html lang="en">
      <Head />
      <Preview>Order #{orderNumber} placed — we'll confirm it soon!</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>KUTHARI BEAUTY STORE</Heading>
            <Text style={headerSub}>Your beauty counter, at your door.</Text>
          </Section>

          {/* Hero */}
          <Section style={hero}>
            <Text style={heroIcon}>🛒</Text>
            <Heading style={heroTitle}>Order Placed!</Heading>
            <Text style={heroText}>
              Thank you, <strong>{address.name}</strong>! Your order has been received.
            </Text>
            <Text style={statusNote}>
              ⏳ Waiting for Kuthari Beauty Store confirmation. You'll get another email once confirmed.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Order meta */}
          <Section style={section}>
            <Row>
              <Column style={metaCol}>
                <Text style={metaLabel}>ORDER NUMBER</Text>
                <Text style={metaValue}>#{orderNumber}</Text>
              </Column>
              <Column style={metaCol}>
                <Text style={metaLabel}>DATE &amp; TIME</Text>
                <Text style={metaValue}>{date}</Text>
              </Column>
              <Column style={metaCol}>
                <Text style={metaLabel}>PAYMENT</Text>
                <Text style={metaValue}>Online Payment</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Items table */}
          <Section style={section}>
            <Heading style={sectionTitle}>Your Items</Heading>
            {items.map((item, i) => (
              <Row key={i} style={itemRow}>
                <Column style={{ width: '48px', paddingRight: '12px' }}>
                  {item.image
                    ? <Img src={item.image} alt={item.name} width={48} height={48} style={itemImg} />
                    : <div style={itemImgPlaceholder} />
                  }
                </Column>
                <Column>
                  <Text style={itemName}>{item.name}</Text>
                  <Text style={itemUnit}>{item.unit} × {item.quantity}</Text>
                </Column>
                <Column style={{ textAlign: 'right' as const }}>
                  <Text style={itemPrice}>{fmt(item.price * item.quantity)}</Text>
                  <Text style={itemUnit}>{fmt(item.price)} each</Text>
                </Column>
              </Row>
            ))}

            {/* Totals */}
            <Hr style={divider} />
            <Row style={totalRow}>
              <Column><Text style={totalLabel}>Subtotal</Text></Column>
              <Column style={{ textAlign: 'right' as const }}><Text style={totalValue}>{fmt(subtotal)}</Text></Column>
            </Row>
            {(discount ?? 0) > 0 && (
              <Row style={totalRow}>
                <Column><Text style={totalLabel}>Discount{couponCode ? ` (${couponCode})` : ''}</Text></Column>
                <Column style={{ textAlign: 'right' as const }}><Text style={{ ...totalValue, color: '#16a34a' }}>−{fmt(discount!)}</Text></Column>
              </Row>
            )}
            <Row style={totalRow}>
              <Column><Text style={totalLabel}>Delivery</Text></Column>
              <Column style={{ textAlign: 'right' as const }}><Text style={totalValue}>{deliveryFee === 0 ? 'FREE' : fmt(deliveryFee)}</Text></Column>
            </Row>
            <Row style={{ ...totalRow, borderTop: '2px solid #292966', paddingTop: '8px' }}>
              <Column><Text style={grandLabel}>Grand Total</Text></Column>
              <Column style={{ textAlign: 'right' as const }}><Text style={grandValue}>{fmt(total)}</Text></Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Address */}
          <Section style={section}>
            <Heading style={sectionTitle}>Delivery Address</Heading>
            <Text style={addressText}>
              {address.name}<br />
              {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
              {address.city}, {address.state} — {address.pincode}<br />
              {address.phone}
            </Text>
          </Section>

          {transportDetails && (
            <Section style={section}>
              <Heading style={sectionTitle}>Transport / Bus</Heading>
              <Text style={addressText}>{transportDetails}</Text>
            </Section>
          )}

          {/* Payment confirmation */}
          <Section style={codBox}>
            <Text style={codText}>
              {paymentMethod === 'cod' ? (
                <>Please keep <strong>{fmt(total)}</strong> ready in cash. You pay when the order arrives.</>
              ) : paymentMethod === 'partial' ? (
                <>
                  <strong>{fmt(amountPaid ?? 0)}</strong> received online. Please keep the balance of{' '}
                  <strong>{fmt(total - (amountPaid ?? 0))}</strong> ready in cash for delivery.
                </>
              ) : (
                <>Payment of <strong>{fmt(total)}</strong> received online. No further payment is needed.</>
              )}
            </Text>
          </Section>

          {/* Delivery note */}
          <Section style={section}>
            <Text style={noteText}>
              📦 We&apos;ll update you once your order is confirmed with an estimated delivery time.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Reply to this email or call us.
            </Text>
            <Link href={`${siteUrl}/orders`} style={footerLink}>View Your Orders</Link>
            <Text style={footerCopy}>
              © {new Date().getFullYear()} Kuthari Beauty Store · Brahmapur, Odisha
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────────

const body = { backgroundColor: '#eeeef8', fontFamily: 'Helvetica, Arial, sans-serif', margin: '0', padding: '20px 0' }
const container = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const }
const header = { backgroundColor: '#292966', padding: '28px 32px', textAlign: 'center' as const }
const headerTitle = { color: '#f7f7fc', fontSize: '28px', fontWeight: '700', margin: '0', letterSpacing: '2px' }
const headerSub = { color: '#a3a3cc', fontSize: '13px', margin: '4px 0 0', letterSpacing: '1px' }
const hero = { padding: '32px 32px 24px', textAlign: 'center' as const }
const heroIcon = { fontSize: '48px', margin: '0 0 8px' }
const heroTitle = { color: '#292966', fontSize: '28px', fontWeight: '700', margin: '0 0 12px' }
const heroText = { color: '#3d2b1f', fontSize: '16px', margin: '0 0 12px' }
const statusNote = { backgroundColor: '#f7f7fc', borderLeft: '4px solid #a3a3cc', color: '#4f453f', fontSize: '14px', padding: '12px 16px', borderRadius: '4px', textAlign: 'left' as const, margin: '12px 0 0' }
const divider = { borderColor: '#e5e1d9', margin: '0' }
const section = { padding: '24px 32px' }
const sectionTitle = { color: '#292966', fontSize: '16px', fontWeight: '700', margin: '0 0 16px', letterSpacing: '0.5px' }
const metaCol = { padding: '0 8px 0 0', verticalAlign: 'top' as const }
const metaLabel = { color: '#81756e', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const, margin: '0 0 2px' }
const metaValue = { color: '#292966', fontSize: '15px', fontWeight: '600', margin: '0' }
const itemRow = { marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e1d9' }
const itemImg = { borderRadius: '8px', objectFit: 'cover' as const }
const itemImgPlaceholder = { width: '48px', height: '48px', backgroundColor: '#eeeef8', borderRadius: '8px' }
const itemName = { color: '#1c1c17', fontSize: '14px', fontWeight: '600', margin: '0 0 2px' }
const itemUnit = { color: '#81756e', fontSize: '12px', margin: '0' }
const itemPrice = { color: '#292966', fontSize: '15px', fontWeight: '700', margin: '0' }
const totalRow = { paddingBottom: '8px' }
const totalLabel = { color: '#4f453f', fontSize: '14px', margin: '0' }
const totalValue = { color: '#1c1c17', fontSize: '14px', margin: '0', textAlign: 'right' as const }
const grandLabel = { color: '#292966', fontSize: '16px', fontWeight: '700', margin: '0' }
const grandValue = { color: '#292966', fontSize: '16px', fontWeight: '700', margin: '0', textAlign: 'right' as const }
const addressText = { color: '#3d2b1f', fontSize: '14px', lineHeight: '1.7', margin: '0' }
const codBox = { backgroundColor: '#f7f7fc', border: '1px solid #a3a3cc', borderRadius: '8px', margin: '0 32px', padding: '16px' }
const codText = { color: '#292966', fontSize: '15px', margin: '0', textAlign: 'center' as const }
const noteText = { color: '#4f453f', fontSize: '14px', margin: '0', textAlign: 'center' as const }
const footer = { backgroundColor: '#eeeef8', padding: '24px 32px', textAlign: 'center' as const }
const footerText = { color: '#81756e', fontSize: '13px', margin: '0 0 8px' }
const footerLink = { color: '#292966', fontSize: '14px', fontWeight: '600', textDecoration: 'underline' }
const footerCopy = { color: '#b0a89e', fontSize: '12px', margin: '16px 0 0' }
