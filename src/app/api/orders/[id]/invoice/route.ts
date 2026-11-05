import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import type { Order } from '@/types/database.types'
import type { OrderEmailData } from '@/lib/resend'

function orderToEmailData(order: Order): OrderEmailData {
  return {
    orderId: order.id,
    // The real KBS/<FY>/<n> number, not a slice of the UUID. This is the GST
    // invoice series the client asked for, and it must match the order.
    orderNumber: order.order_number || `KBS-${order.id.slice(0, 8).toUpperCase()}`,
    items: order.items,
    address: order.address,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    discount: order.discount,
    couponCode: order.coupon_code,
    total: order.total,
    createdAt: order.created_at,
    status: order.status,
    notes: order.notes,
    transportDetails: order.transport_details ?? null,
    // The buyer's GST details. The template renders these conditionally, so
    // omitting them here silently produced a GST invoice with no GST details.
    gstin: order.gstin ?? null,
    gstBusinessName: order.gst_business_name ?? null,
    paymentMethod: order.payment_method ?? null,
    amountPaid: order.amount_paid ?? null,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const isAdmin = meta?.role === 'super_admin' || meta?.role === 'admin'
  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any, error: any

  // `orders` is a service-role-only table (authenticated reads are denied), so
  // BOTH branches must use the admin client. The customer branch is scoped to
  // the session's own profileId, so a customer can only ever fetch their own
  // order — never another customer's by guessing its id.
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()
  if (isAdmin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;({ data, error } = await (supabase as any).from('orders').select('*').eq('id', id).maybeSingle())
  } else {
    const profileId = meta?.supabase_profile_id
    if (!profileId) return NextResponse.json({ error: 'Profile not configured' }, { status: 400 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;({ data, error } = await (supabase as any).from('orders').select('*').eq('id', id).eq('user_id', profileId).maybeSingle())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const order = data as unknown as Order
  // Filename mirrors the invoice number. '/' is illegal in a filename, so
  // KBS/2026-2027/12 becomes KBS-2026-2027-12.
  const orderNumber = (order.order_number || `KBS-${id.slice(0, 8).toUpperCase()}`).replace(/\//g, '-')

  const { generateInvoicePdfBase64 } = await import('@/lib/pdf/invoice')
  let pdfBase64: string
  try {
    pdfBase64 = await generateInvoicePdfBase64(orderToEmailData(order))
  } catch (err) {
    console.error('[invoice] PDF generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }

  const pdfBuffer = Buffer.from(pdfBase64, 'base64')

  // View in the browser by default (admin opens it in a new tab); only force a
  // save when the caller explicitly asks with ?download=1 (the customer's
  // "Download Invoice" buttons). `inline` lets the PDF render in the tab; the
  // filename still applies if the viewer then saves it.
  const disposition = req.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline'

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="KBS-Invoice-${orderNumber}.pdf"`,
      'Content-Length': String(pdfBuffer.byteLength),
    },
  })
}
