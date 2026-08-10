import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import AnnouncementBar from '@/components/home/AnnouncementBar'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import SmoothScroll from '@/components/layout/SmoothScroll'
import CartFloatingBar from '@/components/cart/CartFloatingBar'
import FlyToCartLayer from '@/components/cart/FlyToCartLayer'
import WhatsAppFAB from '@/components/home/WhatsAppFAB'
import LoginPromptModal from '@/components/auth/LoginPromptModal'
import PendingReviewsGate from '@/components/product/PendingReviewsGate'
import type { SiteAnnouncement } from '@/types/database.types'

/**
 * This layout wraps EVERY shop page, so its data is fetched on every single
 * navigation (home → account → cart …). A layout doing uncached DB work blocks
 * the navigation — loading.tsx can't even show until it resolves — which is why
 * moving between pages felt slow.
 *
 * Both values are effectively static (an announcement and category names), so
 * they're cached instead of re-queried on every page change. Edits show up
 * within the revalidate window.
 *
 * Uses the admin client on purpose: the cookie-based client can't run inside
 * unstable_cache, and this is public chrome — no per-user data.
 */
const getShopChrome = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const [cmsRes, catRes] = await Promise.all([
      supabase
        .from('cms_content')
        .select('value')
        .eq('key', 'site_announcement')
        .maybeSingle(),
      supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('display_order')
        .limit(8),
    ])
    return {
      rawAnn: (cmsRes.data as { value?: Record<string, unknown> } | null)?.value ?? null,
      searchTerms: ((catRes.data as { name: string }[] | null) ?? [])
        .map((c) => c.name)
        .filter(Boolean),
    }
  },
  ['shop-layout-chrome'],
  { revalidate: 300, tags: ['shop-chrome'] },
)

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const { rawAnn, searchTerms } = await getShopChrome()
  const announcement: SiteAnnouncement | null =
    rawAnn?.is_active === true && typeof rawAnn?.text === 'string'
      ? {
          text: rawAnn.text as string,
          background_color: (rawAnn.background_color as string) ?? '#000000',
          text_color: (rawAnn.text_color as string) ?? '#ffffff',
          link_url: rawAnn.link_url as string | undefined,
        }
      : null

  return (
    <SmoothScroll>
      <Header searchTerms={searchTerms} />
      <main className="min-h-screen selection:bg-black selection:text-white">
        {announcement && <AnnouncementBar data={announcement} />}
        {children}
      </main>
      <Footer />
      <BottomNav />
      <CartFloatingBar />
      <FlyToCartLayer />
      {/* Site-wide. It hides itself on /cart and /checkout — see the component. */}
      <WhatsAppFAB />
      <LoginPromptModal />
      {/* Asks for a rating on every delivered-but-unreviewed product. Mounted
          on the storefront only — checkout is outside this group, so it can
          never block a purchase. */}
      <PendingReviewsGate />
    </SmoothScroll>
  )
}
