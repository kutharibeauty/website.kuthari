'use client'

import { useRouter } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthPromptStore } from '@/store/authPromptStore'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import AddToCartButton from '@/components/product/AddToCartButton'
import type { Product } from '@/types/database.types'

interface Props {
  product: Product
}

export default function ProductActions({ product }: Props) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const showAuthPrompt = useAuthPromptStore((s) => s.show)
  const { isSignedIn, isLoaded } = useSupabaseUser()

  const handleBuyNow = () => {
    // Require login before adding to cart / buying.
    if (isLoaded && !isSignedIn) {
      showAuthPrompt()
      return
    }
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      unit: product.unit,
      image: product.images?.[0] ?? null,
      slug: product.slug,
      delivery_charge: product.delivery_charge_enabled ? (product.delivery_charge ?? 0) : 0,
    })
    router.push('/checkout')
  }

  const outOfStock = product.stock_qty === 0

  return (
    <>
      {/* ── Desktop actions (inside right column) ── */}
      <div className="hidden lg:flex gap-3 mt-auto pt-4">
        <div className="flex-1">
          <AddToCartButton product={product} />
        </div>
        <button
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="flex-1 py-3 px-6 bg-primary text-on-primary rounded-full font-label-sm text-label-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ShoppingCart size={16} />
          Buy Now
        </button>
      </div>

      {/* ── Mobile sticky action bar ── */}
      <div
        className="fixed bottom-0 left-0 w-full bg-surface-container-lowest shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 py-3 flex gap-3 z-40 lg:hidden border-t border-outline-variant/30"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex-1">
          <AddToCartButton product={product} />
        </div>
        <button
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="flex-1 py-3 px-4 bg-primary text-on-primary rounded-full font-label-sm text-label-sm uppercase tracking-wider active:scale-95 transition-transform shadow-sm disabled:opacity-50 flex items-center justify-center"
        >
          Buy Now
        </button>
      </div>
    </>
  )
}
