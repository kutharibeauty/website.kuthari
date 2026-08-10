import {
  Body, Container, Head, Heading, Hr, Html,
  Preview, Section, Text, Row, Column, Button,
} from '@react-email/components'
import type { LowStockEmailData } from '../index'

type Props = LowStockEmailData & { siteUrl: string }

export default function LowStockAlert({ products, siteUrl }: Props) {
  const critical = products.filter(p => p.stockQty === 0)
  const low = products.filter(p => p.stockQty > 0)

  return (
    <Html lang="en">
      <Head />
      <Preview>{`⚠️ Low Stock Alert — ${products.length} product${products.length > 1 ? 's' : ''} need restocking`}</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Header */}
          <Section style={alertHeader}>
            <Text style={alertIcon}>⚠️</Text>
            <Heading style={alertTitle}>Low Stock Alert</Heading>
            <Text style={alertSub}>{products.length} product{products.length > 1 ? 's' : ''} need restocking</Text>
          </Section>

          {/* Critical: out of stock */}
          {critical.length > 0 && (
            <Section style={section}>
              <Heading style={{ ...sectionTitle, color: '#dc2626' }}>
                🔴 Out of Stock ({critical.length})
              </Heading>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fee2e2' }}>
                    <th style={th}>Product</th>
                    <th style={{ ...th, textAlign: 'center' }}>SKU</th>
                    <th style={{ ...th, textAlign: 'center' }}>Stock</th>
                    <th style={{ ...th, textAlign: 'center' }}>Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {critical.map((p, i) => (
                    <tr key={i} style={{ backgroundColor: '#fff1f2', borderBottom: '1px solid #fecaca' }}>
                      <td style={td}><Text style={productName}>{p.name}</Text></td>
                      <td style={{ ...td, textAlign: 'center' as const }}><Text style={skuText}>{p.sku ?? '—'}</Text></td>
                      <td style={{ ...td, textAlign: 'center' as const }}><Text style={zeroStock}>0</Text></td>
                      <td style={{ ...td, textAlign: 'center' as const }}><Text style={thresholdText}>{p.lowStockThreshold}</Text></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Low stock */}
          {low.length > 0 && (
            <Section style={section}>
              <Heading style={{ ...sectionTitle, color: '#d97706' }}>
                🟡 Low Stock ({low.length})
              </Heading>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fef3c7' }}>
                    <th style={th}>Product</th>
                    <th style={{ ...th, textAlign: 'center' }}>SKU</th>
                    <th style={{ ...th, textAlign: 'center' }}>Stock</th>
                    <th style={{ ...th, textAlign: 'center' }}>Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {low.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #fde68a' }}>
                      <td style={td}><Text style={productName}>{p.name}</Text></td>
                      <td style={{ ...td, textAlign: 'center' as const }}><Text style={skuText}>{p.sku ?? '—'}</Text></td>
                      <td style={{ ...td, textAlign: 'center' as const }}>
                        <Text style={{ ...lowStockNum, color: p.stockQty <= Math.floor(p.lowStockThreshold / 2) ? '#dc2626' : '#d97706' }}>
                          {p.stockQty}
                        </Text>
                      </td>
                      <td style={{ ...td, textAlign: 'center' as const }}><Text style={thresholdText}>{p.lowStockThreshold}</Text></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* CTA */}
          <Section style={{ textAlign: 'center' as const, padding: '0 32px 24px' }}>
            <Button href={`${siteUrl}/admin/products`} style={ctaBtn}>
              Manage Inventory →
            </Button>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>Kuthari Beauty Store Admin · Low Stock Notification</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#f5f0e8', fontFamily: 'Helvetica, Arial, sans-serif', margin: '0', padding: '20px 0' }
const container = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const }
const alertHeader = { backgroundColor: '#92400e', padding: '28px 32px', textAlign: 'center' as const }
const alertIcon = { fontSize: '40px', margin: '0 0 4px' }
const alertTitle = { color: '#ffffff', fontSize: '24px', fontWeight: '700', margin: '0 0 6px' }
const alertSub = { color: '#fde68a', fontSize: '14px', margin: '0' }
const section = { padding: '24px 32px' }
const sectionTitle = { fontSize: '14px', fontWeight: '700', margin: '0 0 14px', textTransform: 'uppercase' as const, letterSpacing: '0.8px' }
const th = { padding: '8px 10px', textAlign: 'left' as const, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' as const, color: '#4f453f' }
const td = { padding: '10px', verticalAlign: 'top' as const }
const productName = { color: '#1c1c17', fontSize: '14px', fontWeight: '600', margin: '0' }
const skuText = { color: '#81756e', fontSize: '12px', fontFamily: 'monospace', margin: '0' }
const zeroStock = { color: '#dc2626', fontSize: '15px', fontWeight: '700', margin: '0' }
const lowStockNum = { fontSize: '15px', fontWeight: '700', margin: '0' }
const thresholdText = { color: '#81756e', fontSize: '13px', margin: '0' }
const ctaBtn = { backgroundColor: '#1b2c3d', color: '#faf6ee', borderRadius: '24px', padding: '14px 28px', fontSize: '15px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }
const divider = { borderColor: '#e5e1d9', margin: '0' }
const footer = { backgroundColor: '#f5f0e8', padding: '20px 32px', textAlign: 'center' as const }
const footerText = { color: '#81756e', fontSize: '12px', margin: '0' }
