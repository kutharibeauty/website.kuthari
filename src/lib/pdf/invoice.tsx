import React from 'react'
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'
import type { OrderEmailData } from '@/lib/resend'
import { LOGO_PNG } from './logo'

// react-pdf's built-in Helvetica has no ₹ glyph (it renders as a blank box), so
// the PDF uses "Rs." for amounts — reliable across all viewers.
const fmt = (n: number) =>
  `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Qty column shows the unit with the count — "10 Boxes" — instead of a bare "10"
// with the unit stacked under the item name. Uses just the unit LABEL (the part
// before " · N pieces"), and pluralises it: 1 Box, 10 Boxes, 3 Hangers.
function qtyWithUnit(quantity: number, unit: string | null | undefined): string {
  const label = (unit ?? '').split('·')[0].trim()
  if (!label) return String(quantity)
  const plural = quantity === 1
    ? label
    : /(x|s|ch|sh)$/i.test(label) ? `${label}es` : `${label}s`
  return `${quantity} ${plural}`
}

// ── Seller (issuer) details ─────────────────────────────────────────────────
// TODO: add the real GSTIN once the client provides one — printing another
// business's GSTIN on this invoice would be wrong, so it's left blank (the
// line below only renders when it's set) rather than guessed.
const SELLER = {
  name: 'KUTHARI BEAUTY STORE',
  tagline: 'Cosmetics, Skincare & Salon Products',
  address: 'Marthapeta St, Sano Bazar, Back side of Ganesh Market, Brahmapur, Odisha - 760009',
  gstin: '',
  phone: '+91 98612 35276 · +91 78490 76520',
  email: 'smortika@gmail.com',
}

const STATUS_LABEL: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipping: 'Out for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

// Sizes are scaled ~0.72x from the original A4 layout so the same design fits an
// A5 page (A5 is ~71% of A4 per side). Proportions, colours and structure are
// unchanged — only font sizes and spacing shrank. The diagonal brand watermark
// was removed.
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 26,
    color: '#1c1c17',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 23, height: 32, marginRight: 9 },
  brandName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1b2c3d', letterSpacing: 1 },
  brandSub: { fontSize: 7, color: '#81756e', marginTop: 2 },
  sellerLine: { fontSize: 7, color: '#4f453f', marginTop: 1.5 },
  gstin: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1b2c3d', marginTop: 3 },

  invoiceBox: { alignItems: 'flex-end' },
  invoiceLabel: {
    fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff',
    backgroundColor: '#1b2c3d', padding: '3 8', borderRadius: 3,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  invoiceMetaLabel: { fontSize: 7, color: '#81756e', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  invoiceMetaValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1b2c3d', marginTop: 1 },
  invoiceDate: { fontSize: 8, color: '#4f453f', marginTop: 4 },

  ruleThick: { borderBottom: '2 solid #1b2c3d', marginBottom: 11 },

  // Bill-to / meta
  row: { flexDirection: 'row', marginBottom: 12 },
  col: { flex: 1 },
  label: { fontSize: 7, color: '#81756e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  addressText: { fontSize: 8, color: '#3d2b1f', lineHeight: 1.6 },
  nameText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1b2c3d', marginBottom: 2 },
  buyerGstin: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1b2c3d', marginTop: 3 },

  // COD box
  paymentBox: {
    backgroundColor: '#faf6ee',
    border: '1 solid #b9862f',
    borderRadius: 4,
    padding: '7 9',
    marginBottom: 12,
  },
  detailLabel: { fontSize: 7, color: '#81756e', textTransform: 'uppercase', letterSpacing: 0.6 },
  detailValue: { fontSize: 8, color: '#3d2b1f', marginTop: 1, lineHeight: 1.4 },

  // GST non-cancellable notice. Warmer/red-tinted vs the cream payment box, so
  // it reads as a condition of sale rather than another routine detail.
  gstNoticeBox: {
    backgroundColor: '#fdf2f2',
    border: '1 solid #dc2626',
    borderRadius: 4,
    padding: '6 9',
    marginTop: 11,
  },
  gstNoticeTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  gstNoticeText: { fontSize: 7, color: '#7c2d2d', marginTop: 2, lineHeight: 1.45 },

  // Items table
  table: { marginBottom: 11 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1b2c3d',
    padding: '5 6',
  },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  thSl: { width: 18 },
  thItem: { flex: 3 },
  thNum: { flex: 1, textAlign: 'center' },
  thPrice: { flex: 1.3, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    padding: '7 6',
    borderBottom: '1 solid #f0e9dc',
    alignItems: 'flex-start',
  },
  tableRowAlt: { backgroundColor: '#fbf7ef' },
  tdSl: { width: 18, fontSize: 8, color: '#81756e', lineHeight: 1.4 },
  // The item cell is a column View; its children must NOT set `flex`, or the
  // name collapses to zero height and the unit renders on top of it.
  tdItemCell: { flex: 3, paddingRight: 6 },
  tdItem: { fontSize: 8, color: '#1c1c17', lineHeight: 1.35 },
  tdUnit: { fontSize: 7, color: '#81756e', marginTop: 2, lineHeight: 1.3 },
  tdNum: { flex: 1, fontSize: 8, color: '#1c1c17', textAlign: 'center', lineHeight: 1.4 },
  tdPrice: { flex: 1.3, fontSize: 8, color: '#1c1c17', textAlign: 'right', lineHeight: 1.4 },
  tdPriceBold: { flex: 1.3, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1c1c17', textAlign: 'right', lineHeight: 1.4 },

  // Totals
  totalsContainer: { marginLeft: 'auto', width: 160 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { fontSize: 8, color: '#4f453f' },
  totalValue: { fontSize: 8, color: '#1c1c17' },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1b2c3d',
    borderRadius: 3,
    padding: '5 8',
    marginTop: 4,
  },
  grandLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  grandValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  // Footer
  footer: {
    borderTop: '1 solid #e5e1d9',
    paddingTop: 9,
    marginTop: 16,
  },
  footerThanks: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1b2c3d', textAlign: 'center', marginBottom: 4 },
  footerText: { fontSize: 7, color: '#81756e', textAlign: 'center', lineHeight: 1.5 },
  footerNote: { fontSize: 6, color: '#a99f95', textAlign: 'center', marginTop: 4 },
})

function InvoiceDocument({ data }: { data: OrderEmailData }) {
  const addr = data.address
  const discount = data.discount ?? 0
  const status = STATUS_LABEL[data.status ?? 'placed'] ?? 'Placed'

  // COD totals are rounded to the nearest rupee, so the exact
  // (subtotal − discount + delivery) can sit a few paise off the grand total.
  // Surface that gap as an explicit Round Off line so the invoice reconciles.
  // Mirrors the order route's total math; it's 0 (and hidden) for whole-rupee
  // orders, which is most of the catalogue.
  const exactTotal = Math.max(0, data.subtotal - discount) + data.deliveryFee
  const roundOff = Math.round((data.total - exactTotal) * 100) / 100
  const date = new Date(data.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <Document title={`Kuthari Invoice ${data.orderNumber}`} author="Kuthari Beauty Store">
      <Page size="A5" style={styles.page}>

        {/* ── Header: logo + seller (left), invoice meta (right) ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.brandRow}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image style={styles.logo} src={LOGO_PNG} />
              <View>
                <Text style={styles.brandName}>{SELLER.name}</Text>
                <Text style={styles.brandSub}>{SELLER.tagline}</Text>
              </View>
            </View>
            <Text style={styles.sellerLine}>{SELLER.address}</Text>
            <Text style={styles.sellerLine}>{SELLER.phone} · {SELLER.email}</Text>
            {SELLER.gstin && <Text style={styles.gstin}>GSTIN: {SELLER.gstin}</Text>}
          </View>

          <View style={styles.invoiceBox}>
            <Text style={styles.invoiceLabel}>Tax Invoice</Text>
            <Text style={styles.invoiceMetaLabel}>Invoice No.</Text>
            <Text style={styles.invoiceMetaValue}>{data.orderNumber}</Text>
            <Text style={styles.invoiceDate}>Date: {date}</Text>
          </View>
        </View>

        <View style={styles.ruleThick} />

        {/* ── Bill To + Payment ── */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Bill To</Text>
            {data.gstBusinessName && (
              <Text style={styles.nameText}>{data.gstBusinessName}</Text>
            )}
            <Text style={data.gstBusinessName ? styles.addressText : styles.nameText}>{addr.name}</Text>
            <Text style={styles.addressText}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</Text>
            <Text style={styles.addressText}>{addr.city}, {addr.state} — {addr.pincode}</Text>
            <Text style={styles.addressText}>{addr.phone}</Text>
            {data.gstin && (
              <Text style={styles.buyerGstin}>GSTIN: {data.gstin}</Text>
            )}
          </View>
          <View style={[styles.col, { alignItems: 'flex-end' }]}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.addressText}>Online Payment</Text>
            <Text style={[styles.label, { marginTop: 10 }]}>Order Status</Text>
            <Text style={styles.addressText}>{status}</Text>
          </View>
        </View>

        {/* ── Transport / lorry + order notes (replaces the amount-to-collect box) ── */}
        {(data.transportDetails || data.notes) ? (
          <View style={styles.paymentBox}>
            {data.transportDetails ? (
              <>
                <Text style={styles.detailLabel}>Transport / Bus</Text>
                <Text style={styles.detailValue}>{data.transportDetails}</Text>
              </>
            ) : null}
            {data.notes ? (
              <>
                <Text style={[styles.detailLabel, data.transportDetails ? { marginTop: 5 } : {}]}>Order Notes</Text>
                <Text style={styles.detailValue}>{data.notes}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        {/* ── Items table ── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.thSl]}>#</Text>
            <Text style={[styles.th, styles.thItem]}>Item</Text>
            <Text style={[styles.th, styles.thNum]}>Qty</Text>
            <Text style={[styles.th, styles.thPrice]}>Unit Price</Text>
            <Text style={[styles.th, styles.thPrice]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} wrap={false} style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]}>
              <Text style={styles.tdSl}>{i + 1}</Text>
              <View style={styles.tdItemCell}>
                <Text style={styles.tdItem}>{item.name}</Text>
              </View>
              <Text style={styles.tdNum}>{qtyWithUnit(item.quantity, item.unit)}</Text>
              <Text style={styles.tdPrice}>{fmt(item.price)}</Text>
              <Text style={styles.tdPriceBold}>{fmt(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(data.subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Discount{data.couponCode ? ` (${data.couponCode})` : ''}
              </Text>
              <Text style={[styles.totalValue, { color: '#16a34a' }]}>−{fmt(discount)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery</Text>
            <Text style={styles.totalValue}>{data.deliveryFee === 0 ? 'FREE' : fmt(data.deliveryFee)}</Text>
          </View>
          {Math.abs(roundOff) >= 0.01 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Round Off</Text>
              <Text style={styles.totalValue}>{roundOff < 0 ? '−' : '+'}{fmt(Math.abs(roundOff))}</Text>
            </View>
          )}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>{fmt(data.total)}</Text>
          </View>
        </View>

        {/* ── GST invoice: non-cancellable notice ──
            A GST bill lets the buyer claim input tax credit, so once it's issued
            the order can't be cancelled at all. The cancel API enforces this;
            the notice states it on the document the buyer keeps. */}
        {data.gstin && (
          <View style={styles.gstNoticeBox}>
            <Text style={styles.gstNoticeTitle}>GST Invoice — Non-Cancellable</Text>
            <Text style={styles.gstNoticeText}>
              This order has been billed with GST details for input tax credit. Once placed, it
              cannot be cancelled under any circumstances, by the customer or on request.
            </Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerThanks}>Thank you for your business!</Text>
          <Text style={styles.footerText}>
            {SELLER.name} · {SELLER.address} · GSTIN: {SELLER.gstin}
          </Text>
          <Text style={styles.footerText}>
            {SELLER.phone} · {SELLER.email}
          </Text>
          <Text style={styles.footerNote}>
            This is a computer-generated invoice and does not require a physical signature.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePdfBase64(data: OrderEmailData): Promise<string> {
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />)
  return Buffer.from(buffer).toString('base64')
}
