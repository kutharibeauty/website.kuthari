import { Column, Row, Section, Text } from '@react-email/components'
import { C, CTA, EmailShell, Hero } from './_kit'

type Props = { name?: string | null; siteUrl: string }

const PERKS = [
  { title: 'One piece or a full box', body: 'Retail price for a single piece, bulk price when you buy by the box.' },
  { title: 'Delivery across India', body: 'Packed at our Brahmapur shop and sent to your door. Free on bigger orders.' },
  { title: 'Pay the way you like', body: 'UPI, card or net banking, with cash on delivery when the shop offers it.' },
]

/**
 * One-time welcome email, sent only when a brand-new customer gives an email at
 * signup. Phone-only signups get nothing (there's no address to reach).
 */
export default function WelcomeCustomer({ name, siteUrl }: Props) {
  const first = (name || '').split(' ')[0]
  return (
    <EmailShell siteUrl={siteUrl} preview="Your Kuthari Beauty Store account is ready.">
      <Hero eyebrow="Welcome" title={first ? `Welcome, ${first}` : 'Welcome to Kuthari'} accent="Your beauty counter, at your door.">
        Your account is ready. Shop skincare, haircare, makeup, salon and grooming products from our shop in
        Brahmapur.
      </Hero>

      <Section style={{ margin: '0 0 12px' }}>
        {PERKS.map((p, i) => (
          <Row key={p.title} style={{ borderTop: i ? `1px solid ${C.line}` : 'none' }}>
            <Column style={{ width: '36px', verticalAlign: 'top' as const, padding: '14px 0' }}>
              <Text style={{ margin: 0, width: '26px', height: '26px', lineHeight: '26px', borderRadius: '13px', backgroundColor: C.periwinkle, color: C.ink, fontSize: '13px', fontWeight: 700, textAlign: 'center' as const }}>
                {i + 1}
              </Text>
            </Column>
            <Column style={{ padding: '14px 0', verticalAlign: 'top' as const }}>
              <Text style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.ink }}>{p.title}</Text>
              <Text style={{ margin: '2px 0 0', fontSize: '14px', lineHeight: '21px', color: C.muted }}>{p.body}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      <CTA href={siteUrl}>Start shopping</CTA>
    </EmailShell>
  )
}
