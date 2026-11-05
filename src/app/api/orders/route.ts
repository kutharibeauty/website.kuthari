import { after } from 'next/server'
import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cleanGstin } from '@/lib/validations/gst'
import { findBuyOption, minQtyFor } from '@/lib/products/packaging'
import { computeDeliveryFee, parseDeliveryConfig, availablePaymentModes, advanceFor } from '@/lib/cart/delivery'
import { isOrderingOpen, formatMinute } from '@/lib/store-hours'
import { createCheckoutOrder, verifyPaymentSignature, fetchPayment, isRazorpayConfigured } from '@/lib/razorpay'
import { getReferralConfig, computeRefereeDiscount, computeReferrerReward } from '@/lib/referral/config'
import { generateUniqueReferralCode } from '@/lib/referral/code'
import type { AuthMetadata } from '@/types'
import type { CartItem, Address, OrderItem } from '@/types/database.types'
import type { OrderEmailData } from '@/lib/resend'

export async function GET() {
  return Response.json({})
}

export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id
  if (!profileId) return Response.json({ error: 'Profile not configured' }, { status: 400 })

  let body: { address_id: string; items: CartItem[]; notes?: string; is_bulk?: boolean; coupon_code?: string; email?: string; gstin?: string; gst_business_name?: string; referral_code?: string; transport_details?: string; payment_method?: 'cod' | 'online' | 'partial'; razorpay?: { order_id?: string; payment_id?: string; signature?: string } }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { address_id, items, notes, coupon_code, email } = body

  if (!address_id || !Array.isArray(items) || items.length === 0) {
    return Response.json({ error: 'address_id and items are required' }, { status: 400 })
  }

  // Optional GST invoice ("claim GST bill"). If a GSTIN is supplied it must be
  // valid, and a business name is required alongside it.
  const gstin = cleanGstin(body.gstin)
  const gstBusinessName = body.gst_business_name?.trim() || null
  if (body.gstin && body.gstin.trim() && !gstin) {
    return Response.json({ error: 'Enter a valid 15-character GSTIN, or leave it blank.' }, { status: 400 })
  }
  if (gstin && !gstBusinessName) {
    return Response.json({ error: 'Business name is required for a GST invoice.' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  // PRD #3: an order requires a valid customer email on file. Enforce it here
  // server-side so it can't be bypassed even if the client gate is skipped.
  // The email the customer typed at checkout is saved to their profile so all
  // order/status emails can reach them (phone-only signups otherwise have none).
  const isRealEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !/@kutharibeauty\.internal$/i.test(e)
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (isRealEmail(cleanEmail)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminDb as any).from('profiles').update({ email: cleanEmail }).eq('id', profileId)
  } else {
    // No valid email supplied — fall back to whatever is already on the profile.
    // Existing customers who already have a real email are unaffected (backfill:
    // existing profiles/orders are exempt; only new orders require an email).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prof } = await (adminDb as any).from('profiles').select('email').eq('id', profileId).maybeSingle()
    if (!isRealEmail((prof?.email as string | null) ?? '')) {
      return Response.json(
        { error: 'A valid email address is required to place your order.', error_code: 'email_required' },
        { status: 400 },
      )
    }
  }

  // Verify the address belongs to this user. `addresses` is a service-role-only
  // table (no anon/authenticated grant), so this MUST use the admin client —
  // scoped to the session's profileId, so it can only ever match the user's own.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawAddress } = await (adminDb as any)
    .from('addresses')
    .select('*')
    .eq('id', address_id)
    .eq('user_id', profileId)
    .maybeSingle()

  const address = rawAddress as unknown as Address | null
  if (!address) return Response.json({ error: 'Address not found' }, { status: 404 })

  // Validate quantities
  for (const item of items) {
    if (!item.id || typeof item.quantity !== 'number' || item.quantity < 1 || !Number.isInteger(item.quantity)) {
      return Response.json({ error: 'Invalid item quantity' }, { status: 400 })
    }
  }

  // Fetch authoritative prices from DB — never trust client-submitted prices.
  // Read via the admin client so RLS can't hide an inactive product (that would
  // make it look "missing" instead of "unavailable").
  const productIds = [...new Set(items.map((i) => i.product_id ?? i.id))]
  const { data: dbProducts } = await adminDb
    .from('products')
    // select('*') on purpose. The live schema has drifted, and naming a column
    // that doesn't exist (pieces_per_secondary/secondary_price only exist once
    // migration 020 runs) makes PostgREST fail the WHOLE query — which would
    // break EVERY order. '*' also picks up the spice hanger/pack columns.
    .select('*')
    .in('id', productIds)

  type DbProduct = {
    id: string; name: string; price: number; mrp: number | null; unit: string
    images: string[] | null; slug: string; is_active: boolean
    pack_type: string | null; unit_type: string | null; units_per_pack: number | null
    pieces_per_secondary: number | null; secondary_price: number | null; secondary_mrp: number | null
    units_per_hanger: number | null; hangers_per_pack: number | null
    retail_price?: number | null; retail_mrp?: number | null; bulk_min_qty?: number | null
  }

  const productMap = new Map<string, DbProduct>(
    ((dbProducts as DbProduct[] | null) ?? []).map((p) => [p.id, p]),
  )

  // Resolve each cart line to authoritative pricing. Flag any line that's
  // unavailable — product deleted/inactive, or a buy option that no longer
  // exists — by its CART LINE id so the client can drop it.
  const unavailableIds: string[] = []
  const orderItems: OrderItem[] = []
  // A bulk order is any order with a line bought above the single-piece retail
  // option (a box, pack, hanger...). Decided here from the DB, never by the client.
  let isBulkOrder = false
  // Bulk lines below the product's bulk-price minimum (admin-set, in pieces).
  const belowBulkMin: string[] = []
  for (const i of items) {
    const pid = i.product_id ?? i.id
    const product = productMap.get(pid)
    if (!product || !product.is_active) { unavailableIds.push(i.id); continue }

    let price = product.price
    let mrp = product.mrp ?? null
    let unit = product.unit
    let stockUnits = i.quantity
    // Packaging levels (Box / Hanger / Pack / Tin): price the chosen level
    // authoritatively from the DB — never trust the client's price.
    const buyOption = findBuyOption(product, i.variant)
    if (buyOption?.level !== 'retail') isBulkOrder = true
    const minQty = minQtyFor(product, buyOption)
    if (i.quantity < minQty) {
      belowBulkMin.push(`${product.name}: at least ${minQty} ${minQty === 1 ? buyOption?.label ?? 'unit' : (buyOption?.pluralLabel ?? buyOption?.label ?? 'units')} for the bulk price`)
    }
    if (buyOption) {
      price = buyOption.price
      mrp = buyOption.mrp
      unit = buyOption.pieces != null
        ? `${buyOption.label} · ${buyOption.pieces} pieces`
        : buyOption.label
      stockUnits = i.quantity
    } else if (i.variant) {
      // A stored buy-option label that no longer resolves (the admin changed the
      // product's packaging since it went in the cart).
      unavailableIds.push(i.id); continue
    }
    orderItems.push({
      product_id: pid,
      name: product.name,
      price,   // authoritative DB price for the chosen buy option
      mrp,
      quantity: i.quantity,
      unit,
      image: product.images?.[0] ?? null,
      stock_units: stockUnits,
    })
  }

  if (belowBulkMin.length > 0) {
    return Response.json({
      error: `Bulk price needs a minimum quantity. ${belowBulkMin.join('; ')}. Add more, or switch to the single-piece price.`,
      error_code: 'bulk_minimum',
    }, { status: 400 })
  }

  if (unavailableIds.length > 0) {
    return Response.json({
      error: 'Some items in your cart are no longer available and were removed. Please review your order.',
      error_code: 'items_unavailable',
      unavailable_ids: unavailableIds,
    }, { status: 400 })
  }

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  // Apply the SAME rule the cart and checkout show, so the charge matches what
  // the customer saw: free at/above the admin threshold, else the pincode's
  // rate (or the default). Thresholds come from the `settings` CMS row.
  const { data: settingsRow } = await adminDb
    .from('cms_content').select('value').eq('key', 'settings').maybeSingle()
  const deliveryConfig = parseDeliveryConfig((settingsRow as { value?: unknown } | null)?.value)

  // Store hours (authoritative). Orders are accepted only inside the admin-set
  // window (IST); the cart/checkout disable their CTAs outside it, but this is
  // the gate that actually can't be bypassed.
  if (!isOrderingOpen(deliveryConfig.orderHours)) {
    const openLabel = formatMinute(deliveryConfig.orderHours.openMinute)
    const closeLabel = formatMinute(deliveryConfig.orderHours.closeMinute)
    return Response.json(
      { error: `Orders are accepted only between ${openLabel} and ${closeLabel} (IST). Please place your order during store hours.` },
      { status: 400 },
    )
  }

  // Authoritative minimum-order gate. The cart and checkout disable their CTAs
  // below this, but the frontend can be bypassed, so the order is rejected here
  // too. 0 = no minimum.
  if (deliveryConfig.minOrderValue > 0 && subtotal < deliveryConfig.minOrderValue) {
    return Response.json(
      { error: `Minimum order value is ₹${deliveryConfig.minOrderValue.toLocaleString('en-IN')}. Add ₹${(deliveryConfig.minOrderValue - subtotal).toLocaleString('en-IN')} more to place your order.` },
      { status: 400 },
    )
  }

  // Delivery is priced by destination. Look the address's pincode rate up here
  // rather than trusting anything the client sent — this is the figure actually
  // charged. A pincode with no row (or no rate set) falls back to the default.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pinRow } = await (adminDb as any)
    .from('serviceable_pincodes')
    .select('delivery_charge')
    .eq('pincode', address.pincode)
    .eq('is_active', true)
    .maybeSingle()

  const deliveryFee = computeDeliveryFee(
    subtotal,
    (pinRow as { delivery_charge: number | null } | null)?.delivery_charge ?? null,
    deliveryConfig,
  )

  // ── Authoritative coupon validation — never trust a client-sent discount ──
  let discountAmt = 0
  let appliedCouponCode: string | null = null
  let appliedCoupon: { id: string; uses_count: number | null } | null = null

  if (coupon_code && coupon_code.trim()) {
    const { data: coupon } = await adminDb
      .from('coupons')
      .select('*')
      .ilike('code', coupon_code.trim())
      .maybeSingle()

    const c = coupon as null | {
      id: string; code: string; discount_type: 'percentage' | 'flat'; discount_value: number
      min_order_value: number | null; max_discount: number | null; max_uses: number | null
      max_uses_per_customer?: number | null
      uses_count: number | null; valid_until: string | null; is_active: boolean
    }

    const invalid =
      !c ||
      !c.is_active ||
      (c.valid_until != null && new Date(c.valid_until) < new Date()) ||
      (c.max_uses != null && (c.uses_count ?? 0) >= c.max_uses) ||
      (c.min_order_value != null && subtotal < c.min_order_value)

    if (invalid) {
      return Response.json({ error: 'This coupon is not valid for your order.' }, { status: 400 })
    }

    // Per-customer cap (migration 031). Counted from THIS customer's own orders,
    // server-side, so it can't be bypassed from the client. Only enforced when
    // the admin has set a limit; a missing column simply yields no count.
    if (c!.max_uses_per_customer != null && c!.max_uses_per_customer > 0) {
      const { count: usedByCustomer } = await adminDb
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .ilike('coupon_code', c!.code)

      if ((usedByCustomer ?? 0) >= c!.max_uses_per_customer) {
        return Response.json(
          {
            error: c!.max_uses_per_customer === 1
              ? 'You have already used this coupon.'
              : `You can only use this coupon ${c!.max_uses_per_customer} times.`,
          },
          { status: 400 },
        )
      }
    }

    let d =
      c!.discount_type === 'percentage'
        ? Math.round((subtotal * c!.discount_value) / 100)
        : c!.discount_value
    if (c!.max_discount != null && d > c!.max_discount) d = c!.max_discount
    discountAmt = Math.min(d, subtotal)
    appliedCouponCode = c!.code
    appliedCoupon = { id: c!.id, uses_count: c!.uses_count }
  }

  // ── Referral program ──────────────────────────────────────────────────────
  // (a) A new customer (0 prior orders) redeeming a code gets the "taker"
  //     discount on this first order; the referrer is credited afterwards.
  // (b) The buyer's own accrued referral credit auto-applies to this order.
  const referralCfg = await getReferralConfig()
  let refereeDiscount = 0
  let referrerIdToCredit: string | null = null
  let redeemedCode: string | null = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: priorOrderCount } = await (adminDb as any)
    .from('orders').select('id', { count: 'exact', head: true }).eq('user_id', profileId)
  const isFirstOrder = (priorOrderCount ?? 0) === 0

  if (referralCfg.enabled && body.referral_code?.trim() && isFirstOrder) {
    // A coupon and a referral code are mutually exclusive — one discount source
    // per order. (The buyer's OWN referrer reward below is separate and still
    // allowed alongside a coupon.)
    if (appliedCouponCode) {
      return Response.json(
        { error: 'Use either a coupon or a referral code, not both.', error_code: 'coupon_referral_exclusive' },
        { status: 400 },
      )
    }
    const code = body.referral_code.trim().toUpperCase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: refProfile } = await (adminDb as any)
      .from('profiles').select('id, referral_code').eq('referral_code', code).maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: alreadyReferred } = await (adminDb as any)
      .from('referrals').select('id').eq('referee_id', profileId).maybeSingle()
    const minOk = referralCfg.min_order_value == null || subtotal >= referralCfg.min_order_value
    if (refProfile && refProfile.id !== profileId && !alreadyReferred && minOk) {
      refereeDiscount = computeRefereeDiscount(subtotal, referralCfg)
      referrerIdToCredit = refProfile.id as string
      redeemedCode = refProfile.referral_code as string
    } else {
      return Response.json(
        { error: 'This referral code cannot be applied to your order.', error_code: 'referral_invalid' },
        { status: 400 },
      )
    }
  }

  // The buyer's OWN referrer reward is count-based (migration 033): every person
  // who ordered with their code grants ONE use of the referrer discount, applied
  // once here and capped at how many people referred them. Independent of any
  // coupon, so it is NOT blocked by one.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: buyerProfile } = await (adminDb as any)
    .from('profiles').select('referral_code, referral_redemptions_used').eq('id', profileId).maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: referralsMade } = await (adminDb as any)
    .from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', profileId)
  const redemptionsUsed = Math.max(0, Number(buyerProfile?.referral_redemptions_used ?? 0))
  const availableReferrerUses = Math.max(0, (referralsMade ?? 0) - redemptionsUsed)

  let referrerRedemption = 0
  if (referralCfg.enabled && availableReferrerUses > 0) {
    referrerRedemption = Math.min(
      computeReferrerReward(subtotal, referralCfg),
      Math.max(0, subtotal - discountAmt - refereeDiscount),
    )
  }
  const consumeReferrerUse = referrerRedemption > 0

  const totalDiscount = discountAmt + refereeDiscount + referrerRedemption
  const exactTotal = Math.max(0, subtotal - totalDiscount) + deliveryFee

  // ── Payment method: online via Razorpay only — the client no longer offers COD ──
  // Online is a two-phase call to THIS endpoint so all the pricing/validation
  // above runs identically both times and the order is created exactly once,
  // only after the payment is verified:
  //   Phase 1 (no razorpay proof): create a Razorpay order for the exact amount
  //     and return it — NO db order yet.
  //   Phase 2 (with razorpay proof): verify the signature, confirm the captured
  //     payment with Razorpay, then fall through and create the order as paid.
  // ── Payment ────────────────────────────────────────────────────────────
  // Three modes, offered by the admin's settings (availablePaymentModes is the
  // same rule the checkout shows):
  //   online  - the full amount through Razorpay
  //   partial - bulk orders only, while COD is off: an advance through Razorpay,
  //             the balance collected in cash on delivery
  //   cod     - the full amount in cash on delivery
  // Razorpay is a two-phase call to THIS endpoint so all the pricing above runs
  // identically both times and the order is created once, after the payment is
  // verified: phase 1 (no proof) returns a Razorpay order for the exact amount,
  // phase 2 (with proof) verifies it and creates the order.
  const mode = body.payment_method ?? 'online'
  const allowed = availablePaymentModes(deliveryConfig, isBulkOrder)
  if (!allowed.includes(mode)) {
    const reason = allowed.length === 0
      ? 'Ordering is paused right now. Please try again shortly or contact us directly.'
      : mode === 'cod'
        ? 'Cash on delivery is not available. Please choose another way to pay.'
        : mode === 'partial'
          ? 'Part payment is only available for bulk orders. Please choose another way to pay.'
          : 'Online payment is currently unavailable. Please try again shortly or contact us directly.'
    return Response.json({ error: reason }, { status: 400 })
  }
  // A part-paid order needs the amount_paid / amount_due columns (migration
  // 042). Check before taking any money, so a payment can never be captured
  // for an order that then fails to save.
  if (mode === 'partial') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: colErr } = await (adminDb as any).from('orders').select('amount_due').limit(1)
    if (colErr) {
      console.error('Part payment unavailable, migration 042 not applied:', colErr.message)
      return Response.json({ error: 'Part payment is not available right now. Please choose another way to pay.' }, { status: 400 })
    }
  }
  if (mode !== 'cod' && !isRazorpayConfigured()) {
    return Response.json({ error: 'Online payment is currently unavailable. Please try again shortly or contact us directly.' }, { status: 400 })
  }

  // Cash changes hands in whole rupees, so any order with a cash part is rounded.
  const total = mode === 'online' ? Math.round(exactTotal * 100) / 100 : Math.round(exactTotal)
  const amountNow = mode === 'online' ? total : mode === 'partial' ? advanceFor(total, deliveryConfig.bulkAdvancePercent) : 0
  const amountPaise = Math.round(amountNow * 100)
  let paymentStatus: 'pending' | 'collected' | 'partial' = 'pending'
  let paymentReference: string | null = null

  if (mode !== 'cod') {
    const rzp = body.razorpay
    if (!rzp?.payment_id || !rzp.order_id || !rzp.signature) {
      // Phase 1 - start the payment. No order is created until it succeeds.
      try {
        const rzOrder = await createCheckoutOrder(amountPaise, `kbs_${profileId.slice(0, 8)}_${Date.now()}`, {
          customer: String(address?.name ?? '').slice(0, 60),
          phone: String(address?.phone ?? ''),
          mode,
        })
        return Response.json({
          needs_payment: true,
          razorpay: {
            key_id: process.env.RAZORPAY_KEY_ID,
            order_id: rzOrder.id,
            amount: rzOrder.amount,
            currency: rzOrder.currency,
          },
        }, { status: 200 })
      } catch (e) {
        console.error('Razorpay order create failed:', e)
        return Response.json({ error: 'Could not start online payment. Please try again shortly.' }, { status: 502 })
      }
    }

    // Phase 2 - a payment came back. Verify it before trusting it.
    if (!verifyPaymentSignature(rzp.order_id, rzp.payment_id, rzp.signature)) {
      return Response.json({ error: 'Payment verification failed. If you were charged, contact support.' }, { status: 400 })
    }
    // Idempotency: a retried/double-submitted callback must not create a 2nd order.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingOrder } = await (adminDb as any)
      .from('orders').select('id').eq('payment_reference', rzp.payment_id).maybeSingle()
    if (existingOrder) return Response.json({ order_id: existingOrder.id }, { status: 200 })
    // Confirm with Razorpay directly: real, captured, for THIS order, exact amount.
    try {
      const pay = await fetchPayment(rzp.payment_id)
      const settled = pay.status === 'captured' || pay.status === 'authorized'
      if (!settled || pay.orderId !== rzp.order_id || pay.amount !== amountPaise) {
        return Response.json({ error: 'Payment could not be confirmed. If you were charged, contact support.' }, { status: 400 })
      }
    } catch (e) {
      console.error('Razorpay payment fetch failed:', e)
      return Response.json({ error: 'Payment could not be confirmed. If you were charged, contact support.' }, { status: 502 })
    }
    paymentStatus = mode === 'online' ? 'collected' : 'partial'
    paymentReference = rzp.payment_id
  }

  const transportDetails = typeof body.transport_details === 'string'
    ? body.transport_details.trim().slice(0, 300)
    : ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderPayload: Record<string, any> = {
    user_id: profileId,
    items: orderItems,
    address,
    subtotal,
    delivery_fee: deliveryFee,
    discount: totalDiscount,
    coupon_code: appliedCouponCode,
    total,
    payment_method: mode,
    payment_status: paymentStatus,
    ...(paymentReference ? { payment_reference: paymentReference } : {}),
    // What was paid online and what the delivery person collects (migration 042).
    amount_paid: amountNow,
    amount_due: Math.round((total - amountNow) * 100) / 100,
    status: 'placed',
    notes: notes?.trim() || null,
    is_bulk: isBulkOrder,
    ...(transportDetails ? { transport_details: transportDetails } : {}),
    // Only reference the GST columns when the buyer actually asked for a GST
    // invoice. Naming a column that doesn't exist on the live table fails the
    // WHOLE insert, so a plain order must never depend on them.
    ...(gstin ? { gstin, gst_business_name: gstBusinessName } : {}),
  }

  let { data: order, error } = await adminDb
    .from('orders').insert(orderPayload).select('id, order_number, created_at').single()

  // transport_details (034) and amount_paid/amount_due (042) are newer columns.
  // If one is missing on the live table, drop it and retry so placing an order
  // never depends on a migration. A 'partial' order needs 042, so it can't fall back.
  if (error && /transport_details/i.test(error.message)) {
    delete orderPayload.transport_details
    ;({ data: order, error } = await adminDb
      .from('orders').insert(orderPayload).select('id, order_number, created_at').single())
  }
  if (error && mode !== 'partial' && /amount_paid|amount_due/i.test(error.message)) {
    delete orderPayload.amount_paid
    delete orderPayload.amount_due
    ;({ data: order, error } = await adminDb
      .from('orders').insert(orderPayload).select('id, order_number, created_at').single())
  }

  if (error) {
    // Surface the real Postgres message — "Failed to create order" alone makes
    // schema/permission problems impossible to diagnose from the client.
    console.error('Order creation failed:', error.message)
    return Response.json({ error: 'Failed to create order', detail: error.message }, { status: 500 })
  }

  const { id: orderId, order_number: orderNumber, created_at: createdAt } =
    order as { id: string; order_number: string; created_at: string }

  // ── Referral: give the buyer their own code now that they've purchased ──
  // Done synchronously so it exists when the order-success celebration loads.
  if (referralCfg.enabled && !buyerProfile?.referral_code) {
    try {
      const newCode = await generateUniqueReferralCode(adminDb, address.name)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminDb as any).from('profiles').update({ referral_code: newCode }).eq('id', profileId)
    } catch (e) { console.error('Referral code generation failed:', e) }
  }

  // Settle referral rewards after the response:
  //   • if the buyer used one of their OWN referrer uses, count it as spent;
  //   • if the buyer redeemed someone's code, record the referral — which is
  //     what grows that referrer's available-uses count (no balance to credit).
  if (referralCfg.enabled && (consumeReferrerUse || referrerIdToCredit)) {
    after(async () => {
      try {
        const db = createAdminClient()
        if (consumeReferrerUse) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).from('profiles')
            .update({ referral_redemptions_used: redemptionsUsed + 1 })
            .eq('id', profileId)
        }
        if (referrerIdToCredit) {
          const reward = computeReferrerReward(subtotal, referralCfg)
          // reward_amount is kept as a record of the reward at referral time; the
          // referrer's benefit is now the extra USE this row grants, not a balance.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).from('referrals').insert({ referrer_id: referrerIdToCredit, referee_id: profileId, code: redeemedCode, order_id: orderId, reward_amount: reward })
        }
      } catch (e) { console.error('Referral settlement failed:', e) }
    })
  }

  // Everything below runs AFTER the response is sent, and every one of them must
  // use `after()` rather than a bare `void`: on serverless the runtime may freeze
  // or kill the function the moment the response returns, dropping any promise
  // that isn't registered. A dropped `void` here means stock silently never
  // decrements (overselling) or a coupon is never counted.
  after(() => decrementStock(orderItems))

  // Record coupon usage atomically so concurrent orders can't push a coupon past
  // its max_uses (migration 014). Falls back to a plain update if the function
  // isn't present yet. Migration 024 drops the old AFTER INSERT trigger that
  // used to double-count this.
  if (appliedCoupon) {
    const cid = appliedCoupon.id
    const prevCount = appliedCoupon.uses_count ?? 0
    after(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminDb as any).rpc('increment_coupon_use', { p_coupon_id: cid })
      if (error) {
        await adminDb.from('coupons').update({ uses_count: prevCount + 1 }).eq('id', cid)
      }
    })
  }

  // Mark this customer's abandoned cart as recovered (best-effort).
  after(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminDb as any).from('abandoned_carts').update({ is_recovered: true }).eq('user_id', profileId)
  })

  // `totalDiscount`, not `discountAmt` — the order was inserted with the coupon
  // AND referral discounts combined, so passing the coupon share alone makes the
  // email/invoice fail to add up against the total the customer actually pays.
  after(() => sendOrderEmails(orderId, orderNumber, createdAt, orderItems, address, subtotal, deliveryFee, totalDiscount, appliedCouponCode, total, profileId, gstin, gstBusinessName, mode, amountNow))

  return Response.json({ order_id: orderId }, { status: 201 })
}

async function sendOrderEmails(
  orderId: string,
  orderNumber: string,
  createdAt: string,
  items: OrderItem[],
  address: Address,
  subtotal: number,
  deliveryFee: number,
  discount: number,
  couponCode: string | null,
  total: number,
  profileId: string,
  gstin: string | null,
  gstBusinessName: string | null,
  paymentMethod?: string,
  amountPaid?: number,
) {
  try {
    const resend = await import('@/lib/resend')
    const supabase = createAdminClient()

    // Get customer email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email')
      .eq('id', profileId)
      .maybeSingle()

    const emailData: OrderEmailData = {
      orderId,
      orderNumber,
      items,
      address,
      subtotal,
      deliveryFee,
      discount,
      couponCode,
      total,
      createdAt,
      customerEmail: (profile as { email?: string | null } | null)?.email ?? null,
      customerName: address.name,
      // Without these the emailed invoice attachment renders as a plain bill,
      // with none of the buyer's GST details on it.
      gstin,
      gstBusinessName,
      paymentMethod,
      amountPaid,
    }

    const admins = await resend.getStaffEmailRecipients()

    await Promise.allSettled([
      resend.sendOrderPlacedCustomer(emailData),
      resend.sendOrderPlacedAdmin(emailData, admins),
      checkLowStock(items, supabase, resend),
    ])
  } catch (e) {
    console.error('Order email error:', e)
  }
}

async function decrementStock(items: OrderItem[]) {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    // A product may appear as several variant lines — sum the stock units per
    // product (spices consume units, not hanger/pack count; falls back to
    // quantity for normal products and legacy lines without stock_units).
    const byProduct = new Map<string, number>()
    for (const i of items) byProduct.set(i.product_id, (byProduct.get(i.product_id) ?? 0) + (i.stock_units ?? i.quantity))

    await Promise.all(
      [...byProduct].map(async ([pid, qty]) => {
        // Atomic guarded decrement (migration 014): never oversells / goes negative.
        const { error } = await db.rpc('decrement_product_stock', { p_product_id: pid, p_qty: qty })
        if (!error) return
        // Fallback if migration 014 isn't applied yet: best-effort read-then-write.
        const { data: p } = await db.from('products').select('stock_qty').eq('id', pid).maybeSingle()
        if (p) await db.from('products').update({ stock_qty: Math.max(0, p.stock_qty - qty) }).eq('id', pid)
      }),
    )
  } catch (e) {
    console.error('Stock decrement failed:', e)
  }
}

async function checkLowStock(
  items: OrderItem[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resend: typeof import('@/lib/resend'),
) {
  const productIds = items.map(i => i.product_id)

  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, stock_qty, low_stock_threshold')
    .in('id', productIds)

  if (!products) return

  type ProductRow = { id: string; name: string; sku: string | null; stock_qty: number; low_stock_threshold: number }
  const lowStock = (products as ProductRow[])
    .filter(p => p.stock_qty <= p.low_stock_threshold)
    .map(p => ({ id: p.id, name: p.name, sku: p.sku, stockQty: p.stock_qty, lowStockThreshold: p.low_stock_threshold }))

  if (!lowStock.length) return

  const admins = await resend.getStaffEmailRecipients()
  await resend.sendLowStockAlert({ products: lowStock }, admins)
}
