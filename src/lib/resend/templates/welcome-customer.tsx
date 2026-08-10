import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from '@react-email/components'

type Props = { name?: string | null; siteUrl: string }

/**
 * One-time welcome email, sent only when a brand-new customer provides a real
 * email at signup. Phone-only signups get nothing (there's no address to reach).
 */
export default function WelcomeCustomer({ name, siteUrl }: Props) {
  const greeting = name ? `Welcome, ${name}!` : 'Welcome to Kuthari Beauty Store!'

  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to Kuthari Beauty Store — wholesale cosmetics at your doorstep.</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>KUTHARI BEAUTY STORE</Heading>
            <Text style={headerSub}>Wholesale. Trusted. Delivered.</Text>
          </Section>

          {/* Hero */}
          <Section style={hero}>
            <Text style={heroIcon}>🎉</Text>
            <Heading style={heroTitle}>{greeting}</Heading>
            <Text style={heroText}>
              Your account is ready. Order wholesale skincare, haircare, makeup, salon and
              grooming products — at wholesale prices, delivered across Odisha.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Perks */}
          <Section style={section}>
            <Text style={perk}>🛒 <strong>Bulk wholesale prices</strong> on everyday essentials</Text>
            <Text style={perk}>🚚 <strong>Fast delivery</strong> across Odisha</Text>
            <Text style={perk}>🔒 <strong>Secure online payment</strong> — pay safely by UPI or card</Text>
          </Section>

          {/* CTA */}
          <Section style={ctaWrap}>
            <Link href={siteUrl} style={ctaButton}>Start Shopping</Link>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Just reply to this email — we&apos;re happy to help.
            </Text>
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

const body = { backgroundColor: '#f5f0e8', fontFamily: 'Helvetica, Arial, sans-serif', margin: '0', padding: '20px 0' }
const container = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const }
const header = { backgroundColor: '#1b2c3d', padding: '28px 32px', textAlign: 'center' as const }
const headerTitle = { color: '#faf6ee', fontSize: '28px', fontWeight: '700', margin: '0', letterSpacing: '2px' }
const headerSub = { color: '#c4a882', fontSize: '13px', margin: '4px 0 0', letterSpacing: '1px' }
const hero = { padding: '32px 32px 24px', textAlign: 'center' as const }
const heroIcon = { fontSize: '48px', margin: '0 0 8px' }
const heroTitle = { color: '#1b2c3d', fontSize: '26px', fontWeight: '700', margin: '0 0 12px' }
const heroText = { color: '#3d2b1f', fontSize: '15px', lineHeight: '1.6', margin: '0' }
const divider = { borderColor: '#e5e1d9', margin: '0' }
const section = { padding: '24px 32px' }
const perk = { color: '#3d2b1f', fontSize: '15px', lineHeight: '1.6', margin: '0 0 10px' }
const ctaWrap = { padding: '0 32px 8px', textAlign: 'center' as const }
const ctaButton = { backgroundColor: '#1b2c3d', color: '#faf6ee', fontSize: '15px', fontWeight: '700', textDecoration: 'none', padding: '14px 32px', borderRadius: '10px', display: 'inline-block' }
const footer = { backgroundColor: '#f5f0e8', padding: '24px 32px', textAlign: 'center' as const }
const footerText = { color: '#81756e', fontSize: '13px', margin: '0 0 8px' }
const footerCopy = { color: '#b0a89e', fontSize: '12px', margin: '16px 0 0' }
