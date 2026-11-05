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

/**
 * A shelf card: the photo on its own rounded panel, the name and the price on
 * one line under it, then the buy button. The panel lifts on hover; the photo
 * itself stays still.
 */
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
    <article className={cn('w-48 md:w-60 flex-shrink-0 flex flex-col group relative', className)}>
      <Link href={`/product/${product.slug}`} className="block flex-1 rounded-[var(--radius-card)]">
        <div className="relative aspect-square w-full rounded-[var(--radius-card)] bg-paper-sunk overflow-hidden transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)] group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lift)]">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              sizes="(max-width: 768px) 192px, 240px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="text-muted/40" size={32} strokeWidth={1.25} />
            </div>
          )}

          {discount && !outOfStock && (
            <span className="absolute top-3.5 left-3.5 rounded-full bg-periwinkle px-2.5 py-1 text-[12px] font-bold text-ink">
              {discount}% off
            </span>
          )}

          {outOfStock && (
            <span className="absolute top-3.5 left-3.5 rounded-full bg-ink px-2.5 py-1 text-[12px] font-bold text-paper-raised">
              Sold out
            </span>
          )}
        </div>

        <div className="pt-3.5 pb-3 flex flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[16px] md:text-[17px] font-semibold leading-snug text-ink capitalize line-clamp-2 min-w-0">
              {name}
            </h3>
            <span className="text-[19px] md:text-[22px] font-bold leading-none text-ink tabular-nums shrink-0">
              ₹{shownPrice.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[13px] text-muted flex flex-wrap items-baseline gap-x-2">
            {product.brand && <span className="capitalize">{product.brand}</span>}
            {unit && <span>{unit}</span>}
            {shownMrp && shownMrp > shownPrice && (
              <s className="tabular-nums">₹{shownMrp.toLocaleString('en-IN')}</s>
            )}
          </p>
          {/* Bulk hint: a shop owner sees there is a better rate inside. */}
          {retail && (
            <p className="text-[13px] font-semibold text-indigo">
              Bulk from ₹{product.price.toLocaleString('en-IN')}
            </p>
          )}
        </div>
      </Link>

      {/* Outside the link so the heart is its own control, not nested in an <a>. */}
      <div className="absolute top-3 right-3 z-20">
        <WishlistButton productId={product.id} />
      </div>

      <div className="mt-auto">
        <AddToCartButton product={product} variant="full" disabled={outOfStock} />
      </div>
    </article>
  )
}
