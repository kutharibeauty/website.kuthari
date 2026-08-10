import {
  Body, Container, Head, Heading, Hr, Html,
  Preview, Section, Text, Row, Column, Link, Button,
} from '@react-email/components'
import type { UnserviceableEmailData } from '../index'
import type { OrderItem } from '@/types/database.types'

type Props = UnserviceableEmailData & { siteUrl: string }

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function UnserviceablePincodeAdmin({
  id, customerName, phone, pincode, city, cartItems, cartValue, siteUrl,
}: Props) {
  const isHighValue = (cartValue ?? 0) >= 10000

  return (
    <Html lang="en">
      <Head />
      <Preview>⚠️ Unserviceable Pincode {pincode} — {phone} {isHighValue ? '🔥 HIGH VALUE LEAD' : ''}</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Alert header */}
          <Section style={alertHeader}>
            <Text style={alertIcon}>⚠️</Text>
            <Heading style={alertTitle}>Unserviceable Pincode Alert</Heading>
            <Text style={alertSub}>A customer couldn&apos;t complete their order due to delivery area</Text>
          </Section>

          {/* High value badge */}
          {isHighValue && (
            <Section style={highValueBanner}>
              <Text style={highValueText}>
                🔥 HIGH VALUE LEAD — Cart: {fmt(cartValue!)}
              </Text>
            </Section>
          )}

          {/* Customer details */}
          <Section style={section}>
            <Heading style={sectionTitle}>Customer Details</Heading>
            <Row style={{ marginBottom: '12px' }}>
              <Column style={detailCol}>
                <Text style={detailLabel}>NAME</Text>
                <Text style={detailValue}>{customerName || '—'}</Text>
              </Column>
              <Column style={detailCol}>
                <Text style={detailLabel}>PHONE</Text>
                <Link href={`tel:${phone}`} style={phoneLink}>{phone}</Link>
              </Column>
            </Row>
            <Row>
              <Column style={detailCol}>
                <Text style={detailLabel}>PINCODE</Text>
                <Text style={{ ...detailValue, fontSize: '20px', color: '#dc2626' }}>{pincode}</Text>
              </Column>
              <Column style={detailCol}>
                <Text style={detailLabel}>CITY</Text>
                <Text style={detailValue}>{city || '—'}</Text>
              </Column>
            </Row>
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: 'center' as const, padding: '0 32px 20px' }}>
            <Button href={`tel:${phone}`} style={contactBtn}>
              📞 Call Customer Now
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Cart items */}
          {cartItems && cartItems.length > 0 && (
            <Section style={section}>
              <Heading style={sectionTitle}>
                Cart at Time of Inquiry
                {cartValue && <span style={cartTotal}> · Total: {fmt(cartValue)}</span>}
              </Heading>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#faf6ee' }}>
                    <th style={th}>Product</th>
                    <th style={{ ...th, textAlign: 'center' }}>Qty</th>
                    <th style={{ ...th, textAlign: 'right' }}>Price</th>
                    <th style={{ ...th, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(cartItems as OrderItem[]).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e5e1d9' }}>
                      <td style={td}>
                        <Text style={itemName}>{item.name}</Text>
                        <Text style={itemUnit}>{item.unit}</Text>
                      </td>
                      <td style={{ ...td, textAlign: 'center' as const }}>
                        <Text style={tdText}>{item.quantity}</Text>
                      </td>
                      <td style={{ ...td, textAlign: 'right' as const }}>
                        <Text style={tdText}>{fmt(item.price)}</Text>
                      </td>
                      <td style={{ ...td, textAlign: 'right' as const }}>
                        <Text style={{ ...tdText, fontWeight: '600' }}>{fmt(item.price * item.quantity)}</Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Note about bulk opportunity */}
          <Section style={noteBox}>
            <Text style={noteText}>
              💡 <strong>Bulk Order Opportunity:</strong> Consider contacting this customer directly
              to arrange a custom delivery or add their pincode to the serviceable area.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Actions */}
          <Section style={{ textAlign: 'center' as const, padding: '20px 32px' }}>
            <Button href={`${siteUrl}/admin/unserviceable/${id}`} style={adminBtn}>
              View in Admin Panel
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>Kuthari Beauty Store Admin · Automated Alert</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#f5f0e8', fontFamily: 'Helvetica, Arial, sans-serif', margin: '0', padding: '20px 0' }
const container = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const }
const alertHeader = { backgroundColor: '#b45309', padding: '28px 32px', textAlign: 'center' as const }
const alertIcon = { fontSize: '40px', margin: '0 0 4px' }
const alertTitle = { color: '#ffffff', fontSize: '24px', fontWeight: '700', margin: '0 0 6px' }
const alertSub = { color: '#fde68a', fontSize: '14px', margin: '0' }
const highValueBanner = { backgroundColor: '#fef08a', padding: '12px 32px', textAlign: 'center' as const }
const highValueText = { color: '#713f12', fontSize: '16px', fontWeight: '700', margin: '0' }
const section = { padding: '24px 32px' }
const sectionTitle = { color: '#1b2c3d', fontSize: '13px', fontWeight: '700', margin: '0 0 16px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const detailCol = { padding: '0 16px 0 0', verticalAlign: 'top' as const }
const detailLabel = { color: '#81756e', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, margin: '0 0 4px' }
const detailValue = { color: '#1c1c17', fontSize: '16px', fontWeight: '700', margin: '0' }
const phoneLink = { color: '#1b2c3d', fontSize: '18px', fontWeight: '700' }
const contactBtn = { backgroundColor: '#16a34a', color: '#ffffff', borderRadius: '24px', padding: '14px 28px', fontSize: '15px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }
const divider = { borderColor: '#e5e1d9', margin: '0' }
const th = { padding: '8px 10px', textAlign: 'left' as const, fontSize: '11px', color: '#4f453f', fontWeight: '600', textTransform: 'uppercase' as const }
const td = { padding: '10px', verticalAlign: 'top' as const }
const tdText = { color: '#1c1c17', fontSize: '13px', margin: '0' }
const itemName = { color: '#1c1c17', fontSize: '14px', fontWeight: '600', margin: '0 0 2px' }
const itemUnit = { color: '#81756e', fontSize: '12px', margin: '0' }
const cartTotal = { color: '#1b2c3d', fontWeight: '700', fontSize: '14px' }
const noteBox = { backgroundColor: '#faf6ee', border: '1px solid #c4a882', margin: '0 32px 24px', padding: '16px', borderRadius: '8px' }
const noteText = { color: '#4f453f', fontSize: '13px', lineHeight: '1.6', margin: '0' }
const adminBtn = { backgroundColor: '#1b2c3d', color: '#faf6ee', borderRadius: '24px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }
const footer = { backgroundColor: '#f5f0e8', padding: '20px 32px', textAlign: 'center' as const }
const footerText = { color: '#81756e', fontSize: '12px', margin: '0' }
