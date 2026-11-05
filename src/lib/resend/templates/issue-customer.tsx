import { Column, Img, Row, Section, Text } from '@react-email/components'
import type { IssueEmailData } from '../index'
import { ISSUE_REASONS, ISSUE_RESOLUTIONS, ISSUE_WINDOW_HOURS } from '@/lib/orders/issues'
import { C, CTA, EmailShell, Facts, Hero, Panel, SectionTitle } from './_kit'

type Props = IssueEmailData & { siteUrl: string }

const COPY = {
  requested: {
    eyebrow: 'Request received', title: "We're on it", accent: "Sorry about that.", tone: 'brand' as const,
    lead: 'We have your photos and details. The shop will look at them and reply, usually within a day.',
  },
  approved: {
    eyebrow: 'Request approved', title: 'Approved', accent: "We'll put it right.", tone: 'good' as const,
    lead: 'We have approved your request and are arranging it now. We will call you if we need anything.',
  },
  rejected: {
    eyebrow: 'Request reviewed', title: "We couldn't approve this", accent: 'Here is why.', tone: 'bad' as const,
    lead: 'We looked at your photos and details carefully. If you think we got this wrong, call or WhatsApp us.',
  },
  resolved: {
    eyebrow: 'All sorted', title: 'Your replacement is on its way', accent: 'Thank you for your patience.', tone: 'good' as const,
    lead: 'The shop has sent your replacement or exchange. You can follow it from your order page.',
  },
}

export default function IssueCustomer({ orderId, orderNumber, issue, customer, siteUrl }: Props) {
  const c = COPY[issue.status]
  const first = (customer.name || '').split(' ')[0]
  return (
    <EmailShell siteUrl={siteUrl} preview={`${c.title}: order #${orderNumber}`}>
      <Hero eyebrow={c.eyebrow} title={c.title} accent={c.accent} tone={c.tone}>
        {first ? `${first}, ${c.lead.charAt(0).toLowerCase()}${c.lead.slice(1)}` : c.lead}
      </Hero>

      {issue.admin_note && issue.status !== 'requested' && (
        <Panel label="Note from the shop" tone={issue.status === 'rejected' ? 'bad' : 'brand'}>{issue.admin_note}</Panel>
      )}

      <Facts items={[
        { label: 'Order', value: `#${orderNumber}` },
        { label: 'Problem', value: ISSUE_REASONS[issue.reason] },
        { label: 'You asked for', value: ISSUE_RESOLUTIONS[issue.resolution] },
      ]} />

      <SectionTitle>Items in this request</SectionTitle>
      <Section style={{ margin: '0 0 20px' }}>
        {issue.items.map((it, i) => (
          <Row key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
            <Column style={{ padding: '10px 0' }}>
              <Text style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: C.text }}>{it.name}</Text>
              <Text style={{ margin: '2px 0 0', fontSize: '13px', color: C.muted }}>{it.unit ? `${it.unit} · ` : ''}Qty {it.quantity}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      {issue.status === 'requested' && (
        <Panel label="Good to know">
          We replace or exchange damaged, faulty or wrong items. We don&apos;t refund money for delivered orders.
          Keep the product and its packaging until we&apos;ve sorted it out. Problems must be reported within{' '}
          {ISSUE_WINDOW_HOURS} hours of delivery.
        </Panel>
      )}

      {issue.photos.length > 0 && issue.status === 'requested' && (
        <Section style={{ margin: '0 0 20px' }}>
          <Row>
            {issue.photos.slice(0, 5).map((p) => (
              <Column key={p} style={{ width: '20%', padding: '0 3px' }}>
                <Img src={p} alt="" width="96" height="96" style={{ borderRadius: '10px', objectFit: 'cover' as const, width: '96px', height: '96px', maxWidth: '100%' }} />
              </Column>
            ))}
          </Row>
        </Section>
      )}

      <CTA href={`${siteUrl}/orders/${orderId}`}>View your order</CTA>
    </EmailShell>
  )
}
