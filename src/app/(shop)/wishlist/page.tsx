import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Heart } from 'lucide-react'
import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AuthMetadata } from '@/types'
import type { Product } from '@/types/database.types'
import ProductGrid from '@/components/product/ProductGrid'

export const metadata: Metadata = {
  title: 'My Wishlist — Kuthari Beauty Store',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/login?next=/wishlist')

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  const profileId = meta?.supabase_profile_id
  if (!profileId) redirect('/')

  const db = createAdminClient()

  let products: Product[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (db as any)
    .from('wishlists')
    .select('product_id')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })

  const ids = ((rows ?? []) as Array<{ product_id: string }>).map((r) => r.product_id)
  if (ids.length) {
    const { data } = await db.from('products').select('*').in('id', ids).eq('is_active', true)
    const byId = new Map(((data ?? []) as Product[]).map((p) => [p.id, p]))
    products = ids.map((id) => byId.get(id)).filter(Boolean) as Product[]
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[60vh]">
      <div className="flex items-center gap-2 mb-6">
        <Heart size={22} className="fill-error text-error" />
        <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight capitalize">My Wishlist</h1>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
            <Heart size={26} className="text-on-surface-variant/50" />
          </div>
          <p className="font-bold text-on-surface-variant/80 max-w-sm">
            Your wishlist is empty. Tap the ♡ on any product to save it for later.
          </p>
          <Link
            href="/search"
            className="px-6 py-3 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          <ProductGrid products={products} />
        </div>
      )}
    </div>
  )
}
