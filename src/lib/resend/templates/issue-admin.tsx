import { Column, Img, Link, Row, Section, Text } from '@react-email/components'
import type { IssueEmailData } from '../index'
import { ISSUE_REASONS, ISSUE_RESOLUTIONS } from '@/lib/orders/issues'
import { C, CTA, EmailShell, Facts, Hero, Panel, SectionTitle, istDate } from './_kit'

type Props = IssueEmailData & { siteUrl: string; variant: 'new' | 'approved' }

const label = { margin: '0 0 4px', fontSize: '10px', letterSpacing: '1.5px', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const }

/**
 * Staff email for a damaged / wrong item request.
 *  - 'new': a customer just reported a problem; review the photos.
 *  - 'approved': the request was approved; everything needed to book the
 *    replacement or exchange (contact, address, items) is in the email.
 */
export default function IssueAdmin({ orderId, orderNumber, issue, customer, siteUrl, variant, deliveredAt }: Props) {
  const isNew = variant === 'new'
  const digits = (customer.phone ?? '').replace(/\D/g, '')
  const wa = `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`
  const a = customer.address

  return (
    <EmailShell
      siteUrl={siteUrl}
      audience="staff"
      preview={isNew
        ? `${ISSUE_REASONS[issue.reason]} on order #${orderNumber}. Review the photos.`
        : `Approved: book a ${issue.resolution} for #${orderNumber}, ${customer.name}.`}
    >
      <Hero
        eyebrow={isNew ? 'Damaged / wrong item' : 'Book the replacement'}
        title={isNew ? ISSUE_REASONS[issue.reason] : `${ISSUE_RESOLUTIONS[issue.resolution]}`}
        accent={`Order #${orderNumber}`}
        tone={isNew ? 'warn' : 'good'}
      >
        {isNew
          ? <>{customer.name} reported a problem and asked us to <strong>{ISSUE_RESOLUTIONS[issue.resolution].toLowerCase()}</strong>. Check the photos, then approve or reject it.</>
          : <>Approved{issue.reviewed_by ? ` by ${issue.reviewed_by}` : ''}. Everything you need to book it is below. Mark it as sent once it&apos;s on the way.</>}
      </Hero>

      <CTA href={`${siteUrl}/admin/returns/${issue.id}`}>{isNew ? 'Review request' : 'Open request'}</CTA>

      <Facts items={[
        { label: 'Reported', value: istDate(issue.created_at, true) },
        { label: 'Delivered', value: deliveredAt ? istDate(deliveredAt, true) : '—' },
        { label: 'Wants', value: ISSUE_RESOLUTIONS[issue.resolution] },
      ]} />

      {issue.description && <Panel label="In the customer's words">{issue.description}</Panel>}
      {!isNew && issue.admin_note && <Panel label="Staff note">{issue.admin_note}</Panel>}

      {/* Customer details. On approval this is the booking slip. */}
      <Section style={{ backgroundColor: C.paper, borderRadius: '14px', padding: '16px 18px', margin: '0 0 22px' }}>
        <Text style={label}>Customer</Text>
        <Text style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 700, color: C.ink }}>{customer.name}</Text>
        <Text style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '22px', color: C.text }}>
          <Link href={`tel:${customer.phone}`} style={{ color: C.ink, fontWeight: 700 }}>{customer.phone}</Link>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <Link href={wa} style={{ color: C.green, fontWeight: 700 }}>WhatsApp</Link>
          {customer.email ? <><br /><Link href={`mailto:${customer.email}`} style={{ color: C.ink }}>{customer.email}</Link></> : null}
        </Text>
        {a && (
          <>
            <Text style={label}>Delivery address</Text>
            <Text style={{ margin: 0, fontSize: '14px', lineHeight: '22px', color: C.text }}>
              {a.name}<br />
              {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
              {a.city}, {a.state} {a.pincode}<br />
              {a.phone}
            </Text>
          </>
        )}
      </Section>

      <SectionTitle>Items to {issue.resolution === 'exchange' ? 'exchange' : 'replace'}</SectionTitle>
      <Section style={{ margin: '0 0 22px' }}>
        {issue.items.map((it, i) => (
          <Row key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
            <Column style={{ padding: '10px 0' }}>
              <Text style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: C.text }}>{it.name}</Text>
              <Text style={{ margin: '2px 0 0', fontSize: '13px', color: C.muted }}>{it.unit ? `${it.unit} · ` : ''}Qty {it.quantity}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      {issue.photos.length > 0 && (
        <>
          <SectionTitle>Photos ({issue.photos.length})</SectionTitle>
          <Section style={{ margin: '0 0 22px' }}>
            <Row>
              {issue.photos.slice(0, 5).map((p) => (
                <Column key={p} style={{ width: '20%', padding: '0 3px' }}>
                  <Link href={p}>
                    <Img src={p} alt="Customer photo" width="96" height="96" style={{ borderRadius: '10px', objectFit: 'cover' as const, width: '96px', height: '96px', maxWidth: '100%' }} />
                  </Link>
                </Column>
              ))}
            </Row>
            <Text style={{ margin: '8px 0 0', fontSize: '12px', color: C.muted }}>Tap a photo to open it full size.</Text>
          </Section>
        </>
      )}

      <Text style={{ margin: '0 0 20px', fontSize: '13px', color: C.muted, textAlign: 'center' as const }}>
        <Link href={`${siteUrl}/admin/orders/${orderId}`} style={{ color: C.ink }}>Open the original order</Link>
      </Text>
    </EmailShell>
  )
}
