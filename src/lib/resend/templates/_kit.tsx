/**
 * Shared building blocks for every Kuthari email.
 *
 * Email clients ignore most CSS, so everything here is inline styles and
 * tables (via react-email's Row/Column). Headings use Georgia, which matches
 * the serif wordmark in the logo and exists on every device; body text uses
 * Helvetica/Arial. Colours are the store palette.
 */
import type { ReactNode } from 'react'
import {
  Body, Button, Column, Container, Head, Hr, Html, Img, Link, Preview, Row, Section, Text,
} from '@react-email/components'
import type { Address, OrderItem } from '@/types/database.types'

export const C = {
  ink: '#292966',
  indigo: '#5C5C99',
  lavender: '#A3A3CC',
  periwinkle: '#CCCCFF',
  paper: '#F7F7FC',
  wash: '#EEEEF8',
  line: '#E3E3F0',
  text: '#26263A',
  muted: '#6B6B85',
  gold: '#B9862F',
  green: '#1E7B4F',
  greenWash: '#E7F5EE',
  red: '#B42318',
  redWash: '#FDECEA',
  amber: '#9A5B00',
  amberWash: '#FFF4E0',
}

const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export const STORE = {
  name: 'Kuthari Beauty Store',
  address: 'Marthapeta St, near Sano Bazar, Triveni Nagar, Brahmapur, Odisha 760009',
  phone: '+91 98612 35276',
  tel: '+919861235276',
  whatsapp: 'https://wa.me/919861235276',
  googleReview: 'https://search.google.com/local/writereview?placeid=ChIJ-ccrQRtQPToRSU6_TG62QZs',
}

export const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const istDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    // Emails render on the server (UTC); pin to IST so a late-night order isn't dated a day off.
    timeZone: 'Asia/Kolkata',
  })

// ── Page ────────────────────────────────────────────────────────────────────

export function EmailShell({
  preview, siteUrl, children, audience = 'customer',
}: { preview: string; siteUrl: string; children: ReactNode; audience?: 'customer' | 'staff' }) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: C.wash, fontFamily: SANS, margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '20px 20px 0 0', padding: '28px 32px 20px', textAlign: 'center' as const }}>
            <Link href={siteUrl}>
              <Img src={`${siteUrl}/images/email/logo.png`} width="96" height="92" alt="Kuthari Beauty Store" style={{ margin: '0 auto' }} />
            </Link>
            {audience === 'staff' && (
              <Text style={{ margin: '10px 0 0', fontSize: '11px', letterSpacing: '2px', color: C.indigo, fontWeight: 700 }}>STORE DESK</Text>
            )}
          </Section>
          <Section style={{ backgroundColor: '#ffffff', padding: '0 32px 8px' }}>
            {children}
          </Section>
          <Footer siteUrl={siteUrl} audience={audience} />
        </Container>
      </Body>
    </Html>
  )
}

function Footer({ siteUrl, audience }: { siteUrl: string; audience: 'customer' | 'staff' }) {
  const link = { color: '#ffffff', fontSize: '13px', textDecoration: 'underline', fontWeight: 600 }
  return (
    <Section style={{ backgroundColor: C.ink, borderRadius: '0 0 20px 20px', padding: '28px 32px', textAlign: 'center' as const }}>
      <Text style={{ margin: '0 0 6px', fontFamily: SERIF, fontSize: '18px', color: '#ffffff' }}>Kuthari Beauty Store</Text>
      <Text style={{ margin: '0 0 14px', fontSize: '13px', lineHeight: '20px', color: C.periwinkle }}>
        {STORE.address}
      </Text>
      <Text style={{ margin: '0 0 16px' }}>
        <Link href={`tel:${STORE.tel}`} style={link}>{STORE.phone}</Link>
        <span style={{ color: C.lavender }}>&nbsp;&nbsp;·&nbsp;&nbsp;</span>
        <Link href={STORE.whatsapp} style={link}>WhatsApp us</Link>
        {audience === 'customer' && (
          <>
            <span style={{ color: C.lavender }}>&nbsp;&nbsp;·&nbsp;&nbsp;</span>
            <Link href={`${siteUrl}/orders`} style={link}>My orders</Link>
          </>
        )}
      </Text>
      <Text style={{ margin: 0, fontSize: '11px', lineHeight: '17px', color: C.lavender }}>
        {audience === 'customer'
          ? <>You&apos;re getting this because you shop at <Link href={siteUrl} style={{ color: C.lavender }}>kutharibeauty.com</Link>. Reply to this email if you need anything.</>
          : <>Sent to staff of Kuthari Beauty Store.</>}
      </Text>
    </Section>
  )
}

// ── Blocks ──────────────────────────────────────────────────────────────────

/** Eyebrow, serif headline, italic accent line and an optional lead paragraph. */
export function Hero({
  eyebrow, title, accent, children, tone = 'brand',
}: { eyebrow: string; title: string; accent?: string; children?: ReactNode; tone?: 'brand' | 'good' | 'bad' | 'warn' }) {
  const eyebrowColor = { brand: C.indigo, good: C.green, bad: C.red, warn: C.amber }[tone]
  return (
    <Section style={{ padding: '8px 0 20px', textAlign: 'center' as const }}>
      <Text style={{ margin: '0 0 10px', fontSize: '11px', letterSpacing: '2.5px', fontWeight: 700, color: eyebrowColor, textTransform: 'uppercase' as const }}>
        {eyebrow}
      </Text>
      <Text style={{ margin: 0, fontFamily: SERIF, fontSize: '32px', lineHeight: '38px', color: C.ink, fontWeight: 400 }}>
        {title}
      </Text>
      {accent && (
        <Text style={{ margin: '6px 0 0', fontFamily: SERIF, fontStyle: 'italic', fontSize: '18px', lineHeight: '26px', color: C.indigo }}>
          {accent}
        </Text>
      )}
      {children && (
        <Text style={{ margin: '16px auto 0', maxWidth: '460px', fontSize: '15px', lineHeight: '24px', color: C.text }}>
          {children}
        </Text>
      )}
    </Section>
  )
}

export function CTA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ textAlign: 'center' as const, padding: '4px 0 24px' }}>
      <Button
        href={href}
        style={{ backgroundColor: C.ink, color: '#ffffff', borderRadius: '999px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}
      >
        {children}
      </Button>
    </Section>
  )
}

/** A soft panel for a short message (admin note, delivery estimate, notices). */
export function Panel({
  label, children, tone = 'brand',
}: { label?: string; children: ReactNode; tone?: 'brand' | 'good' | 'bad' | 'warn' }) {
  const bg = { brand: C.paper, good: C.greenWash, bad: C.redWash, warn: C.amberWash }[tone]
  const edge = { brand: C.lavender, good: C.green, bad: C.red, warn: C.amber }[tone]
  const ink = { brand: C.indigo, good: C.green, bad: C.red, warn: C.amber }[tone]
  return (
    <Section style={{ backgroundColor: bg, borderLeft: `4px solid ${edge}`, borderRadius: '12px', padding: '14px 18px', margin: '0 0 20px' }}>
      {label && (
        <Text style={{ margin: '0 0 4px', fontSize: '11px', letterSpacing: '1.5px', fontWeight: 700, color: ink, textTransform: 'uppercase' as const }}>{label}</Text>
      )}
      <Text style={{ margin: 0, fontSize: '15px', lineHeight: '23px', color: C.text }}>{children}</Text>
    </Section>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={{ margin: '0 0 12px', fontFamily: SERIF, fontSize: '19px', color: C.ink }}>{children}</Text>
  )
}

export const Divider = () => <Hr style={{ borderColor: C.line, margin: '4px 0 22px' }} />

/** Two to three label/value pairs in a row (order number, date, payment…). */
export function Facts({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <Section style={{ backgroundColor: C.paper, borderRadius: '14px', padding: '14px 16px', margin: '0 0 22px' }}>
      <Row>
        {items.map((f) => (
          <Column key={f.label} style={{ verticalAlign: 'top' as const, padding: '0 6px' }}>
            <Text style={{ margin: '0 0 3px', fontSize: '10px', letterSpacing: '1.5px', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const }}>{f.label}</Text>
            <Text style={{ margin: 0, fontSize: '14px', lineHeight: '20px', fontWeight: 700, color: C.ink }}>{f.value}</Text>
          </Column>
        ))}
      </Row>
    </Section>
  )
}

export function ItemList({ items, showImages = true }: { items: OrderItem[]; showImages?: boolean }) {
  return (
    <Section style={{ margin: '0 0 8px' }}>
      {items.map((item, i) => (
        <Row key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
          {showImages && (
            <Column style={{ width: '60px', padding: '12px 12px 12px 0', verticalAlign: 'middle' as const }}>
              {item.image
                ? <Img src={item.image} alt="" width="52" height="52" style={{ borderRadius: '10px', objectFit: 'cover' as const, backgroundColor: C.wash }} />
                : <div style={{ width: '52px', height: '52px', borderRadius: '10px', backgroundColor: C.wash }} />}
            </Column>
          )}
          <Column style={{ padding: '12px 0', verticalAlign: 'middle' as const }}>
            <Text style={{ margin: 0, fontSize: '14px', lineHeight: '20px', fontWeight: 600, color: C.text }}>{item.name}</Text>
            <Text style={{ margin: '2px 0 0', fontSize: '13px', color: C.muted }}>
              {item.unit ? `${item.unit} · ` : ''}Qty {item.quantity} × {inr(item.price)}
            </Text>
          </Column>
          <Column style={{ padding: '12px 0 12px 12px', textAlign: 'right' as const, verticalAlign: 'middle' as const, whiteSpace: 'nowrap' as const }}>
            <Text style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.ink }}>{inr(item.price * item.quantity)}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  )
}

export function Totals({
  subtotal, discount, couponCode, deliveryFee, total,
}: { subtotal: number; discount?: number; couponCode?: string | null; deliveryFee: number; total: number }) {
  const line = (label: string, value: string, color: string = C.text) => (
    <Row>
      <Column><Text style={{ margin: '0 0 6px', fontSize: '14px', color: C.muted }}>{label}</Text></Column>
      <Column style={{ textAlign: 'right' as const }}><Text style={{ margin: '0 0 6px', fontSize: '14px', color }}>{value}</Text></Column>
    </Row>
  )
  return (
    <Section style={{ margin: '8px 0 22px' }}>
      {line('Subtotal', inr(subtotal))}
      {(discount ?? 0) > 0 && line(`Discount${couponCode ? ` (${couponCode})` : ''}`, `−${inr(discount!)}`, C.green)}
      {line('Delivery', deliveryFee === 0 ? 'Free' : inr(deliveryFee))}
      <Row style={{ borderTop: `2px solid ${C.ink}` }}>
        <Column><Text style={{ margin: '10px 0 0', fontFamily: SERIF, fontSize: '18px', color: C.ink }}>Total</Text></Column>
        <Column style={{ textAlign: 'right' as const }}><Text style={{ margin: '10px 0 0', fontSize: '20px', fontWeight: 700, color: C.ink }}>{inr(total)}</Text></Column>
      </Row>
    </Section>
  )
}

/** How the order is being paid, in one sentence. */
export function paymentSummary(method: string | null | undefined, total: number, paid: number | null | undefined) {
  const p = Number(paid ?? 0)
  if (method === 'cod') return { label: 'Cash on delivery', note: <>Please keep <strong>{inr(total)}</strong> ready in cash. You pay when the order arrives.</> }
  if (method === 'partial') {
    return {
      label: 'Part paid online',
      note: <><strong>{inr(p)}</strong> paid online. Please keep the balance of <strong>{inr(Math.max(0, total - p))}</strong> ready in cash for delivery.</>,
    }
  }
  return { label: 'Paid online', note: <>We received <strong>{inr(total)}</strong> online. Nothing more to pay.</> }
}

export function AddressBlock({ address, transportDetails }: { address: Address; transportDetails?: string | null }) {
  return (
    <Section style={{ margin: '0 0 22px' }}>
      <Row>
        <Column style={{ verticalAlign: 'top' as const, paddingRight: '12px' }}>
          <Text style={{ margin: '0 0 6px', fontSize: '10px', letterSpacing: '1.5px', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const }}>Delivering to</Text>
          <Text style={{ margin: 0, fontSize: '14px', lineHeight: '22px', color: C.text }}>
            <strong>{address.name}</strong><br />
            {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
            {address.city}, {address.state} {address.pincode}<br />
            {address.phone}
          </Text>
        </Column>
        {transportDetails && (
          <Column style={{ verticalAlign: 'top' as const }}>
            <Text style={{ margin: '0 0 6px', fontSize: '10px', letterSpacing: '1.5px', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const }}>Transport / bus</Text>
            <Text style={{ margin: 0, fontSize: '14px', lineHeight: '22px', color: C.text }}>{transportDetails}</Text>
          </Column>
        )}
      </Row>
    </Section>
  )
}

const STEPS = ['Placed', 'Confirmed', 'Packed', 'On the way', 'Delivered']
const STEP_INDEX: Record<string, number> = { placed: 0, confirmed: 1, packed: 2, shipping: 3, out_for_delivery: 3, delivered: 4 }

/** A five-step progress bar. Renders nothing for cancelled/returned orders. */
export function Progress({ status }: { status: string }) {
  const at = STEP_INDEX[status]
  if (at === undefined) return null
  return (
    <Section style={{ margin: '0 0 24px' }}>
      <Row>
        {STEPS.map((label, i) => {
          const done = i <= at
          return (
            <Column key={label} style={{ width: '20%', padding: '0 2px', verticalAlign: 'top' as const }}>
              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: done ? C.ink : C.line }} />
              <Text style={{ margin: '8px 0 0', fontSize: '11px', lineHeight: '14px', textAlign: 'center' as const, color: i === at ? C.ink : done ? C.indigo : C.muted, fontWeight: i === at ? 700 : 400 }}>
                {label}
              </Text>
            </Column>
          )
        })}
      </Row>
    </Section>
  )
}

export function ReviewNudge() {
  return (
    <Section style={{ backgroundColor: C.paper, borderRadius: '14px', padding: '18px', margin: '0 0 22px', textAlign: 'center' as const }}>
      <Text style={{ margin: '0 0 4px', fontFamily: SERIF, fontSize: '18px', color: C.ink }}>Happy with your order?</Text>
      <Text style={{ margin: '0 0 12px', fontSize: '14px', color: C.muted }}>A quick Google review helps other shoppers in Brahmapur find us.</Text>
      <Link href={STORE.googleReview} style={{ color: C.ink, fontSize: '14px', fontWeight: 700, textDecoration: 'underline' }}>
        ★★★★★&nbsp; Rate us on Google
      </Link>
    </Section>
  )
}
