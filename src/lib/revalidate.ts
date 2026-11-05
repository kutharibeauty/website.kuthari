import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Make the storefront show an admin change on the next visit instead of after
 * its cache window (home 60s, chrome 5 min). Cheap for a store this size: it
 * marks the shop's pages and the cached chrome (categories, announcement,
 * footer content) as stale.
 */
export function refreshStorefront() {
  try {
    revalidateTag('shop-chrome', { expire: 0 })
    revalidatePath('/', 'layout')
    // Not under the page layout, so refreshed by name.
    revalidatePath('/sitemap.xml')
    revalidatePath('/api/merchant-feed')
  } catch (err) {
    // Never let a cache refresh turn a successful save into an error.
    console.error('[refreshStorefront]', err)
  }
}

/** Wrap a route handler: after any successful write, refresh the storefront. */
export function withStorefrontRefresh<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    const res = await handler(...args)
    if (res.ok) refreshStorefront()
    return res
  }
}
