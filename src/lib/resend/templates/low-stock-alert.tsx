import { Column, Row, Section, Text } from '@react-email/components'
import type { LowStockEmailData } from '../index'
import { C, CTA, EmailShell, Hero, SectionTitle } from './_kit'

type Props = LowStockEmailData & { siteUrl: string }

type P = LowStockEmailData['products'][number]

function StockTable({ rows, tone }: { rows: P[]; tone: 'out' | 'low' }) {
  const color = tone === 'out' ? C.red : C.amber
  const head = { margin: 0, fontSize: '10px', letterSpacing: '1.5px', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const }
  return (
    <Section style={{ margin: '0 0 24px' }}>
      <Row style={{ borderBottom: `2px solid ${C.ink}` }}>
        <Column style={{ padding: '0 0 6px' }}><Text style={head}>Product</Text></Column>
        <Column style={{ width: '70px', padding: '0 0 6px', textAlign: 'right' as const }}><Text style={head}>In stock</Text></Column>
        <Column style={{ width: '70px', padding: '0 0 6px', textAlign: 'right' as const }}><Text style={head}>Alert at</Text></Column>
      </Row>
      {rows.map((p) => (
        <Row key={p.id} style={{ borderBottom: `1px solid ${C.line}` }}>
          <Column style={{ padding: '10px 0' }}>
            <Text style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: C.text }}>{p.name}</Text>
            {p.sku && <Text style={{ margin: '2px 0 0', fontSize: '12px', color: C.muted }}>{p.sku}</Text>}
          </Column>
          <Column style={{ width: '70px', textAlign: 'right' as const }}>
            <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color }}>{p.stockQty}</Text>
          </Column>
          <Column style={{ width: '70px', textAlign: 'right' as const }}>
            <Text style={{ margin: 0, fontSize: '14px', color: C.muted }}>{p.lowStockThreshold}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  )
}

export default function LowStockAlert({ products, siteUrl }: Props) {
  const out = products.filter((p) => p.stockQty <= 0)
  const low = products.filter((p) => p.stockQty > 0)
  const n = products.length

  return (
    <EmailShell siteUrl={siteUrl} audience="staff" preview={`${n} product${n === 1 ? '' : 's'} need restocking${out.length ? `, ${out.length} sold out` : ''}.`}>
      <Hero eyebrow="Stock check" title={`${n} to restock`} tone={out.length ? 'bad' : 'warn'}
        accent={out.length ? `${out.length} already sold out` : 'Running low'}>
        These products are at or below their alert level.
      </Hero>

      {out.length > 0 && (<><SectionTitle>Sold out</SectionTitle><StockTable rows={out} tone="out" /></>)}
      {low.length > 0 && (<><SectionTitle>Running low</SectionTitle><StockTable rows={low} tone="low" /></>)}

      <CTA href={`${siteUrl}/admin/products`}>Update stock</CTA>
    </EmailShell>
  )
}
