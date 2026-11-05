import React from 'react'
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'
import type { OrderEmailData } from '@/lib/resend'
import { LOGO_PNG } from './logo'
import { lineTerms } from '@/lib/orders/line-terms'

// react-pdf's built-in fonts have no ₹ glyph (it renders as a blank box), so the
// PDF uses "Rs." for amounts — reliable across all viewers.
const fmt = (n: number) =>
  `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Seller (issuer) details ─────────────────────────────────────────────────
// Add the real GSTIN once the client provides one. Until then the document is a
// plain "Invoice": a "Tax Invoice" must carry the seller's GSTIN.
const SELLER = {
  name: 'Kuthari Beauty Store',
  tagline: 'Cosmetics, Skincare & Salon Products',
  address: 'Marthapeta St, near Sano Bazar, Triveni Nagar, Brahmapur, Odisha 760009',
  gstin: '',
  phone: '+91 98612 35276',
  email: 'smortika@gmail.com',
  web: 'www.kutharibeauty.com',
}

const STATUS_LABEL: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipping: 'Out for delivery',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

const INK = '#292966'
const INDIGO = '#5C5C99'
const LAVENDER = '#A3A3CC'
const PERI = '#CCCCFF'
const PAPER = '#F7F7FC'
const LINE = '#E3E3F0'
const TEXT = '#26263A'
const MUTED = '#6B6B85'

const s = StyleSheet.create({
  page: { backgroundColor: '#ffffff', fontFamily: 'Helvetica', fontSize: 8, padding: 26, paddingBottom: 40, color: TEXT },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 26, height: 36, marginRight: 9 },
  brandName: { fontSize: 15, fontFamily: 'Times-Bold', color: INK },
  brandSub: { fontSize: 7, color: INDIGO, fontFamily: 'Times-Italic', marginTop: 1 },
  sellerBlock: { marginTop: 8 },
  sellerLine: { fontSize: 7, color: MUTED, lineHeight: 1.45 },
  sellerGstin: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: INK, marginTop: 2 },

  docBox: { alignItems: 'flex-end' },
  docTitle: { fontSize: 17, fontFamily: 'Times-Roman', color: INK, letterSpacing: 2.5, textTransform: 'uppercase' },
  docMetaLabel: { fontSize: 6.5, color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6 },
  docMetaValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: INK, marginTop: 1 },
  pill: { marginTop: 7, backgroundColor: PERI, color: INK, fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '2.5 8', borderRadius: 8, letterSpacing: 0.6, textTransform: 'uppercase' },

  band: { height: 3, backgroundColor: INK, marginTop: 12, marginBottom: 1 },
  bandThin: { height: 1, backgroundColor: LAVENDER, marginBottom: 12 },

  // Parties
  parties: { flexDirection: 'row', marginBottom: 12 },
  party: { flex: 1, paddingRight: 10 },
  label: { fontSize: 6.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  name: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 2 },
  body: { fontSize: 7.5, color: TEXT, lineHeight: 1.5 },
  bodyBold: { fontSize: 7.5, color: INK, fontFamily: 'Helvetica-Bold', lineHeight: 1.5 },

  // Notes
  noteBox: { backgroundColor: PAPER, borderLeft: `2 solid ${LAVENDER}`, padding: '6 9', marginBottom: 12 },
  noteLabel: { fontSize: 6.5, color: INDIGO, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: 'Helvetica-Bold' },
  noteText: { fontSize: 7.5, color: TEXT, marginTop: 1.5, lineHeight: 1.45 },

  // Items
  table: { marginBottom: 10 },
  thead: { flexDirection: 'row', backgroundColor: INK, padding: '5 6', borderRadius: 2 },
  th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.6 },
  colSl: { width: 16 },
  colItem: { flex: 3, paddingRight: 6 },
  colQty: { flex: 1.1, textAlign: 'center' },
  colRate: { flex: 1.2, textAlign: 'right' },
  colAmt: { flex: 1.3, textAlign: 'right' },
  tr: { flexDirection: 'row', padding: '6 6', borderBottom: `0.75 solid ${LINE}`, alignItems: 'flex-start' },
  trAlt: { backgroundColor: PAPER },
  td: { fontSize: 7.5, color: TEXT, lineHeight: 1.4 },
  tdMuted: { fontSize: 7.5, color: MUTED, lineHeight: 1.4 },
  tdBold: { fontSize: 7.5, color: INK, fontFamily: 'Helvetica-Bold', lineHeight: 1.4 },
  tdSub: { fontSize: 6.5, color: MUTED, marginTop: 1.5, lineHeight: 1.3 },

  // Totals
  totalsWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  wordsBox: { flex: 1, paddingRight: 14 },
  totals: { width: 170 },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  tLabel: { fontSize: 7.5, color: MUTED },
  tValue: { fontSize: 7.5, color: TEXT },
  grand: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: INK, borderRadius: 3, padding: '6 8', marginTop: 4 },
  grandLabel: { fontSize: 10, fontFamily: 'Times-Bold', color: '#ffffff' },
  grandValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, borderBottom: `0.75 solid ${LINE}` },
  payDue: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: INK },

  // GST notice
  gstBox: { backgroundColor: '#FDECEA', border: '1 solid #B42318', borderRadius: 3, padding: '6 9', marginTop: 12 },
  gstTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#B42318', letterSpacing: 0.4, textTransform: 'uppercase' },
  gstText: { fontSize: 7, color: '#7A271A', marginTop: 2, lineHeight: 1.45 },

  // Footer
  thanks: { fontSize: 11, fontFamily: 'Times-Italic', color: INK, marginTop: 14 },
  thanksSub: { fontSize: 7, color: MUTED, marginTop: 2, lineHeight: 1.4 },
  footer: { position: 'absolute', left: 26, right: 26, bottom: 16, borderTop: `0.75 solid ${LINE}`, paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 6, color: LAVENDER },
})

/** Whole rupees in Indian words, e.g. 1250 → "One thousand two hundred fifty". */
function rupeesInWords(n: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  const two = (x: number) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ` ${ones[x % 10]}` : ''}`)
  const three = (x: number) => (x >= 100 ? `${ones[Math.floor(x / 100)]} hundred${x % 100 ? ` ${two(x % 100)}` : ''}` : two(x))
  let r = Math.floor(n)
  if (r === 0) return 'Zero'
  const parts: string[] = []
  const crore = Math.floor(r / 1e7); r %= 1e7
  const lakh = Math.floor(r / 1e5); r %= 1e5
  const thousand = Math.floor(r / 1e3); r %= 1e3
  if (crore) parts.push(`${three(crore)} crore`)
  if (lakh) parts.push(`${two(lakh)} lakh`)
  if (thousand) parts.push(`${two(thousand)} thousand`)
  if (r) parts.push(three(r))
  const out = parts.join(' ')
  return out.charAt(0).toUpperCase() + out.slice(1)
}

function paymentLines(data: OrderEmailData) {
  const method = data.paymentMethod ?? 'online'
  const delivered = data.status === 'delivered'
  const paidOnline = method === 'online' ? data.total : Math.min(data.total, Number(data.amountPaid ?? 0))
  const rest = Math.max(0, Math.round((data.total - paidOnline) * 100) / 100)
  const label = method === 'cod' ? 'Cash on delivery' : method === 'partial' ? 'Part online, rest cash on delivery' : 'Paid online'
  return { label, paidOnline, rest, delivered, method }
}

function InvoiceDocument({ data }: { data: OrderEmailData }) {
  const addr = data.address
  const discount = data.discount ?? 0
  const status = STATUS_LABEL[data.status ?? 'placed'] ?? 'Placed'
  const pay = paymentLines(data)

  // COD totals are rounded to the nearest rupee, so the exact
  // (subtotal − discount + delivery) can sit a few paise off the grand total.
  // Show that gap as a Round Off line so the invoice reconciles.
  const exactTotal = Math.max(0, data.subtotal - discount) + data.deliveryFee
  const roundOff = Math.round((data.total - exactTotal) * 100) / 100
  const date = new Date(data.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata',
  })
  const title = SELLER.gstin ? 'Tax Invoice' : 'Invoice'

  return (
    <Document title={`Kuthari ${title} ${data.orderNumber}`} author={SELLER.name}>
      <Page size="A5" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <View style={s.brandRow}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image style={s.logo} src={LOGO_PNG} />
              <View>
                <Text style={s.brandName}>{SELLER.name}</Text>
                <Text style={s.brandSub}>{SELLER.tagline}</Text>
              </View>
            </View>
            <View style={s.sellerBlock}>
              <Text style={s.sellerLine}>{SELLER.address}</Text>
              <Text style={s.sellerLine}>{SELLER.phone} · {SELLER.email} · {SELLER.web}</Text>
              {SELLER.gstin ? <Text style={s.sellerGstin}>GSTIN {SELLER.gstin}</Text> : null}
            </View>
          </View>

          <View style={s.docBox}>
            <Text style={s.docTitle}>{title}</Text>
            <Text style={s.docMetaLabel}>Invoice no.</Text>
            <Text style={s.docMetaValue}>{data.orderNumber}</Text>
            <Text style={s.docMetaLabel}>Date</Text>
            <Text style={s.docMetaValue}>{date}</Text>
            <Text style={s.pill}>{status}</Text>
          </View>
        </View>

        <View style={s.band} />
        <View style={s.bandThin} />

        {/* ── Billed to / Payment ── */}
        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>Billed to</Text>
            {data.gstBusinessName ? <Text style={s.name}>{data.gstBusinessName}</Text> : null}
            <Text style={data.gstBusinessName ? s.bodyBold : s.name}>{addr.name}</Text>
            <Text style={s.body}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</Text>
            <Text style={s.body}>{addr.city}, {addr.state} {addr.pincode}</Text>
            <Text style={s.body}>{addr.phone}</Text>
            {data.gstin ? <Text style={[s.bodyBold, { marginTop: 2 }]}>GSTIN {data.gstin}</Text> : null}
          </View>
          <View style={[s.party, { paddingRight: 0 }]}>
            <Text style={s.label}>Payment</Text>
            <Text style={s.bodyBold}>{pay.label}</Text>
            {pay.method !== 'cod' && <Text style={s.body}>{pay.method === 'online' ? 'Amount paid' : 'Paid online'}: {fmt(pay.paidOnline)}</Text>}
            {pay.rest > 0 && (
              <Text style={s.body}>{pay.delivered ? 'Collected in cash' : 'Due on delivery'}: {fmt(pay.rest)}</Text>
            )}
          </View>
        </View>

        {(data.transportDetails || data.notes) ? (
          <View style={s.noteBox}>
            {data.transportDetails ? (
              <>
                <Text style={s.noteLabel}>Transport / bus</Text>
                <Text style={s.noteText}>{data.transportDetails}</Text>
              </>
            ) : null}
            {data.notes ? (
              <>
                <Text style={[s.noteLabel, data.transportDetails ? { marginTop: 5 } : {}]}>Order notes</Text>
                <Text style={s.noteText}>{data.notes}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        {/* ── Items ── */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.colSl]}>#</Text>
            <Text style={[s.th, s.colItem]}>Item</Text>
            <Text style={[s.th, s.colQty]}>Qty</Text>
            <Text style={[s.th, s.colRate]}>Rate</Text>
            <Text style={[s.th, s.colAmt]}>Amount</Text>
          </View>
          {data.items.map((item, i) => {
            const t = lineTerms(item.quantity, item.unit)
            return (
              <View key={i} wrap={false} style={[s.tr, ...(i % 2 === 1 ? [s.trAlt] : [])]}>
                <Text style={[s.tdMuted, s.colSl]}>{i + 1}</Text>
                <View style={s.colItem}>
                  <Text style={s.td}>{item.name}{t.size ? ` (${t.size})` : ''}</Text>
                  {t.priceType ? <Text style={s.tdSub}>{t.priceType}</Text> : null}
                </View>
                <View style={s.colQty}>
                  <Text style={[s.td, { textAlign: 'center' }]}>{t.qty}</Text>
                  {t.qtyNote ? <Text style={[s.tdSub, { textAlign: 'center' }]}>{t.qtyNote}</Text> : null}
                </View>
                <View style={s.colRate}>
                  <Text style={[s.td, { textAlign: 'right' }]}>{fmt(item.price)}</Text>
                  <Text style={[s.tdSub, { textAlign: 'right' }]}>per {t.per}</Text>
                </View>
                <Text style={[s.tdBold, s.colAmt]}>{fmt(item.price * item.quantity)}</Text>
              </View>
            )
          })}
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsWrap} wrap={false}>
          <View style={s.wordsBox}>
            <Text style={s.label}>Amount in words</Text>
            <Text style={s.body}>Rupees {rupeesInWords(data.total)}{Math.round((data.total % 1) * 100) ? ` and ${Math.round((data.total % 1) * 100)} paise` : ''} only</Text>
            <Text style={s.thanks}>Thank you for shopping with us.</Text>
            <Text style={s.thanksSub}>Questions about this order? Call or WhatsApp {SELLER.phone}.</Text>
          </View>
          <View style={s.totals}>
            <View style={s.tRow}><Text style={s.tLabel}>Subtotal</Text><Text style={s.tValue}>{fmt(data.subtotal)}</Text></View>
            {discount > 0 && (
              <View style={s.tRow}>
                <Text style={s.tLabel}>Discount{data.couponCode ? ` (${data.couponCode})` : ''}</Text>
                <Text style={[s.tValue, { color: '#1E7B4F' }]}>-{fmt(discount)}</Text>
              </View>
            )}
            <View style={s.tRow}><Text style={s.tLabel}>Delivery</Text><Text style={s.tValue}>{data.deliveryFee === 0 ? 'Free' : fmt(data.deliveryFee)}</Text></View>
            {Math.abs(roundOff) >= 0.01 && (
              <View style={s.tRow}>
                <Text style={s.tLabel}>Round off</Text>
                <Text style={s.tValue}>{roundOff < 0 ? '-' : '+'}{fmt(Math.abs(roundOff))}</Text>
              </View>
            )}
            <View style={s.grand}>
              <Text style={s.grandLabel}>Total</Text>
              <Text style={s.grandValue}>{fmt(data.total)}</Text>
            </View>
            {pay.method !== 'online' && (
              <View style={{ marginTop: 4 }}>
                {pay.method === 'partial' && (
                  <View style={s.payRow}><Text style={s.tLabel}>Paid online</Text><Text style={s.tValue}>{fmt(pay.paidOnline)}</Text></View>
                )}
                <View style={s.payRow}>
                  <Text style={s.payDue}>{pay.delivered ? 'Collected on delivery' : 'Balance due on delivery'}</Text>
                  <Text style={s.payDue}>{fmt(pay.rest)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* A GST bill lets the buyer claim input tax credit, so once it's issued the
            order can't be cancelled. The cancel API enforces this; the notice
            states it on the document the buyer keeps. */}
        {data.gstin ? (
          <View style={s.gstBox} wrap={false}>
            <Text style={s.gstTitle}>GST invoice · non-cancellable</Text>
            <Text style={s.gstText}>
              This order has been billed with GST details for input tax credit. Once placed, it cannot be
              cancelled under any circumstances, by the customer or on request.
            </Text>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Computer-generated invoice. No signature required.</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${data.orderNumber} · Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePdfBase64(data: OrderEmailData): Promise<string> {
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />)
  return Buffer.from(buffer).toString('base64')
}
