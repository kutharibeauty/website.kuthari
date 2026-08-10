'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/hooks/useT'
import AddToCartButton from './AddToCartButton'
import WishlistButton from './WishlistButton'
import { retailOption } from '@/lib/products/packaging'
import type { Product } from '@/types/database.types'

interface ProductCardProps {
  product: Product
  className?: string
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const { tField } = useT()
  const name = tField(product.name, product.name_or)
  const unit = tField(product.unit, product.unit_or)

  // Retail-first: lead with the single-piece price when the product has one,
  // so the card shows what a walk-up customer actually pays.
  const retail = retailOption(product)
  const shownPrice = retail?.price ?? product.price
  const shownMrp = retail ? retail.mrp : product.mrp

  const discount =
    shownMrp && shownMrp > shownPrice
      ? Math.round((1 - shownPrice / shownMrp) * 100)
      : null

  const outOfStock = product.stock_qty === 0

  return (
    <div
      className={cn(
        'w-44 md:w-52 flex-shrink-0 card-soft card-soft-hover flex flex-col group relative overflow-hidden',
        className,
      )}
    >
      <Link href={`/product/${product.slug}`} className="block flex-1 relative z-10">
        {/* ── Image ── */}
        <div className="relative aspect-[4/5] w-full bg-surface-container-low/60 overflow-hidden">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              sizes="(max-width: 768px) 176px, 208px"
              className="object-contain p-6 mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="text-on-surface-variant/20" size={32} strokeWidth={1.25} />
            </div>
          )}

          {/* Discount — a quiet gold rule-tag, not a shouty pill */}
          {discount && !outOfStock && (
            <span className="absolute top-3 left-3 bg-secondary/95 text-on-secondary text-[10px] font-semibold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full">
              {discount}% off
            </span>
          )}

          <div className="absolute top-3 right-3 z-20">
            <WishlistButton productId={product.id} />
          </div>

          {outOfStock && (
            <div className="absolute inset-0 bg-surface/70 backdrop-blur-[2px] flex items-center justify-center">
              <span className="eyebrow bg-surface-card px-3.5 py-2 rounded-full shadow-sm">
                Sold out
              </span>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="px-4 pt-4 pb-2 flex flex-col gap-1">
          {product.brand && (
            <p className="eyebrow truncate">{product.brand}</p>
          )}

          {/* Name in the serif — the single biggest shift away from the old
              all-caps slab treatment. */}
          <h4 className="font-heading text-[15px] md:text-base font-semibold text-primary leading-snug line-clamp-2 min-h-[42px]">
            {name}
          </h4>

          <p className="text-[11px] font-medium text-on-surface-variant/70">{unit}</p>

          {/* Price */}
          <div className="flex items-baseline gap-2 flex-wrap mt-2">
            <span className="text-lg font-semibold text-primary tracking-tight">
              ₹{shownPrice.toLocaleString('en-IN')}
            </span>
            {shownMrp && shownMrp > shownPrice && (
              <span className="text-[11px] text-on-surface-variant/50 line-through">
                ₹{shownMrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Bulk hint — tells a shop owner there is a better rate inside,
              without cluttering the retail-facing price above. */}
          {retail && (
            <p className="text-[10px] font-medium text-secondary tracking-wide">
              Bulk from ₹{product.price.toLocaleString('en-IN')}
            </p>
          )}
        </div>
      </Link>

      <div className="px-4 pb-4 pt-2 mt-auto">
        <AddToCartButton product={product} variant="full" disabled={outOfStock} />
      </div>
    </div>
  )
}
