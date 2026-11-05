import {
  Body, Container, Head, Heading, Hr, Html,
  Preview, Section, Text, Row, Column, Link,
} from '@react-email/components'
import type { OrderEmailData } from '../index'

type Props = OrderEmailData & { siteUrl: string }

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const STATUS_CONFIG: Record<string, { icon: string; title: string; subtitle: string; color: string; bg: string }> = {
  confirmed:        { icon: '✅', title: 'Order Confirmed!',      subtitle: 'Your order has been confirmed.',             color: '#16a34a', bg: '#dcfce7' },
  packed:           { icon: '📦', title: 'Order Packed!',         subtitle: 'Your order is packed and ready.',            color: '#d97706', bg: '#fef3c7' },
  shipping:         { icon: '🚚', title: 'Out for Delivery!',     subtitle: 'Your order is on its way to you.',           color: '#7c3aed', bg: '#ede9fe' },
  out_for_delivery: { icon: '🚚', title: 'Out for Delivery!',     subtitle: 'Your order is on its way to you.',           color: '#7c3aed', bg: '#ede9fe' },
  delivered:        { icon: '🎉', title: 'Order Delivered!',      subtitle: 'Your order has been delivered. Enjoy!',      color: '#16a34a', bg: '#dcfce7' },
  cancelled:        { icon: '❌', title: 'Order Cancelled',       subtitle: 'Your order has been cancelled.',             color: '#dc2626', bg: '#fee2e2' },
  returned:         { icon: '↩️', title: 'Order Returned',        subtitle: 'Your order has been returned.',              color: '#dc2626', bg: '#fee2e2' },
}

const TIMELINE_STEPS = ['placed', 'confirmed', 'packed', 'shipping', 'delivered']

function stepIndex(status: string) {
  const map: Record<string, number> = { placed: 0, confirmed: 1, packed: 2, shipping: 3, out_for_delivery: 3, delivered: 4, cancelled: -1 }
  return map[status] ?? -1
}

export default function OrderStatusUpdate({
  orderNumber, orderId, items, address, total, createdAt,
  status = 'confirmed', estimatedDelivery, customMessage, siteUrl,
}: Props & { orderId: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['confirmed']
  const currentStep = stepIndex(status)

  const date = new Date(createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    // Emails render on the server (UTC); pin to IST so a late-night order isn't dated a day off.
    timeZone: 'Asia/Kolkata',
  })

  return (
    <Html lang="en">
      <Head />
      <Preview>{cfg.icon} {cfg.title} — Order #{orderNumber}</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>KUTHARI BEAUTY STORE</Heading>
          </Section>

          {/* Status hero */}
          <Section style={{ ...statusHero, backgroundColor: cfg.bg }}>
            <Text style={statusIcon}>{cfg.icon}</Text>
            <Heading style={{ ...statusTitle, color: cfg.color }}>{cfg.title}</Heading>
            <Text style={statusSub}>{cfg.subtitle}</Text>
          </Section>

          {/* Custom admin message */}
          {customMessage && (
            <Section style={msgBox}>
              <Text style={msgText}>&ldquo;{customMessage}&rdquo;</Text>
            </Section>
          )}

          {/* Estimated delivery */}
          {estimatedDelivery && status !== 'delivered' && status !== 'cancelled' && status !== 'returned' && (
            <Section style={deliveryNote}>
              <Text style={deliveryText}>
                🚚 Estimated Delivery: <strong>{estimatedDelivery}</strong>
              </Text>
            </Section>
          )}

          <Hr style={divider} />

          {/* Order timeline */}
          <Section style={section}>
            <Heading style={sectionTitle}>Order Progress</Heading>
            {status === 'cancelled' ? (
              <Text style={cancelledNote}>This order has been cancelled.</Text>
            ) : status === 'returned' ? (
              <Text style={cancelledNote}>This order has been returned.</Text>
            ) : (
              TIMELINE_STEPS.map((step, i) => {
                const isActive = i === currentStep
                const isDone = i < currentStep
                return (
                  <Row key={i} style={timeRow}>
                    <Column style={{ width: '24px', textAlign: 'center' as const, verticalAlign: 'middle' as const }}>
                      <div style={isActive ? dotActive : isDone ? dotDone : dotPending} />
                    </Column>
                    <Column>
                      <Text style={isActive ? stepActive : isDone ? stepDone : stepPending}>
                        {step.charAt(0).toUpperCase() + step.slice(1).replace('_', ' ')}
                        {isActive ? ' ←' : ''}
                      </Text>
                    </Column>
                  </Row>
                )
              })
            )}
          </Section>

          <Hr style={divider} />

          {/* Order summary */}
          <Section style={section}>
            <Heading style={sectionTitle}>Order Summary</Heading>
            <Row>
              <Column>
                <Text style={metaLabel}>ORDER #</Text>
                <Text style={metaValue}>#{orderNumber}</Text>
              </Column>
              <Column>
                <Text style={metaLabel}>DATE</Text>
                <Text style={metaValue}>{date}</Text>
              </Column>
              <Column>
                <Text style={metaLabel}>TOTAL</Text>
                <Text style={metaValue}>{fmt(total)}</Text>
              </Column>
            </Row>

            <Hr style={{ ...divider, margin: '16px 0' }} />

            {items.map((item, i) => (
              <Row key={i} style={{ marginBottom: '8px' }}>
                <Column><Text style={itemName}>{item.name} × {item.quantity}</Text></Column>
                <Column style={{ textAlign: 'right' as const }}>
                  <Text style={itemPrice}>{fmt(item.price * item.quantity)}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          {status === 'delivered' && (
            <Section style={invoiceNote}>
              <Text style={invoiceText}>
                📄 Your invoice is attached to this email (PDF)
              </Text>
            </Section>
          )}

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Link href={`${siteUrl}/orders/${orderId}`} style={trackLink}>View Order Details →</Link>
            <Text style={footerText}>
              Kuthari Beauty Store · Brahmapur, Odisha · smortika@gmail.com · +91 98612 35276
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#eeeef8', fontFamily: 'Helvetica, Arial, sans-serif', margin: '0', padding: '20px 0' }
const container = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const }
const header = { backgroundColor: '#292966', padding: '22px 32px', textAlign: 'center' as const }
const headerTitle = { color: '#f7f7fc', fontSize: '22px', fontWeight: '700', margin: '0', letterSpacing: '2px' }
const statusHero = { padding: '32px', textAlign: 'center' as const }
const statusIcon = { fontSize: '52px', margin: '0 0 8px' }
const statusTitle = { fontSize: '28px', fontWeight: '700', margin: '0 0 8px' }
const statusSub = { color: '#4f453f', fontSize: '15px', margin: '0' }
const msgBox = { backgroundColor: '#f7f7fc', borderLeft: '4px solid #292966', margin: '0 32px', padding: '14px 20px' }
const msgText = { color: '#292966', fontSize: '14px', fontStyle: 'italic', lineHeight: '1.6', margin: '0' }
const deliveryNote = { padding: '12px 32px', textAlign: 'center' as const }
const deliveryText = { color: '#292966', fontSize: '15px', margin: '0' }
const divider = { borderColor: '#e5e1d9', margin: '0' }
const section = { padding: '24px 32px' }
const sectionTitle = { color: '#292966', fontSize: '13px', fontWeight: '700', margin: '0 0 16px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const cancelledNote = { color: '#dc2626', fontSize: '14px', margin: '0' }
const timeRow = { paddingBottom: '10px' }
const dotDone = { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#d1fae5', border: '2px solid #16a34a', margin: '0 auto' }
const dotActive = { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#292966', border: '2px solid #292966', margin: '0 auto' }
const dotPending = { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ffffff', border: '2px solid #d6d3d1', margin: '0 auto' }
const stepActive = { color: '#292966', fontSize: '14px', fontWeight: '700', margin: '0', paddingLeft: '12px' }
const stepDone = { color: '#4f453f', fontSize: '14px', margin: '0', paddingLeft: '12px' }
const stepPending = { color: '#c4bcb8', fontSize: '14px', margin: '0', paddingLeft: '12px' }
const metaLabel = { color: '#81756e', fontSize: '10px', letterSpacing: '1.2px', textTransform: 'uppercase' as const, margin: '0 0 2px' }
const metaValue = { color: '#1c1c17', fontSize: '14px', fontWeight: '600', margin: '0' }
const itemName = { color: '#4f453f', fontSize: '13px', margin: '0' }
const itemPrice = { color: '#1c1c17', fontSize: '13px', fontWeight: '600', margin: '0', textAlign: 'right' as const }
const invoiceNote = { backgroundColor: '#f7f7fc', padding: '12px 32px', textAlign: 'center' as const }
const invoiceText = { color: '#4f453f', fontSize: '13px', margin: '0' }
const footer = { backgroundColor: '#eeeef8', padding: '24px 32px', textAlign: 'center' as const }
const trackLink = { color: '#292966', fontSize: '14px', fontWeight: '700', textDecoration: 'underline' }
const footerText = { color: '#81756e', fontSize: '12px', margin: '16px 0 0' }
