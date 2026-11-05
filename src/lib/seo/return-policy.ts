const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.kutharibeauty.com'

/**
 * Kuthari Beauty Store's policy: no change-of-mind returns and no refunds on delivered orders.
 *
 * Declared once here and emitted in two places that each need to validate on
 * their own page — the site-level `Organization` markup (home page) and every
 * product's `offers` (Google's Product spec reads it from the Offer, and the
 * Organization block isn't present on product pages, so a cross-page `@id`
 * reference alone would dangle). Shared `@id` ties them to one policy.
 *
 * `merchantReturnDays`, `returnFees` and `returnMethod` are intentionally
 * ABSENT: schema.org only defines them for policies that permit returns, and
 * emitting them alongside MerchantReturnNotPermitted would be contradictory.
 *
 * Damaged, faulty or wrong items reported within 48 hours are replaced or
 * exchanged (lib/orders/issues.ts, api/orders/[id]/issue). That is a
 * replacement, not a return for refund, so change-of-mind returns are still
 * not permitted and this markup stays accurate.
 */
export const RETURN_POLICY_JSONLD = {
  '@type': 'MerchantReturnPolicy',
  '@id': `${APP_URL}/#return-policy`,
  applicableCountry: 'IN',
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
}
