const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.kutharibeauty.com'

/**
 * Kuthari Beauty Store's confirmed policy: NO customer returns or exchanges are accepted.
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
 * Internal back-office handling of goods that come back (damaged / wrong item)
 * is a separate thing — see api/orders/[id]/return/route.ts. It is not a
 * customer return and does not change this policy.
 */
export const RETURN_POLICY_JSONLD = {
  '@type': 'MerchantReturnPolicy',
  '@id': `${APP_URL}/#return-policy`,
  applicableCountry: 'IN',
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
}
