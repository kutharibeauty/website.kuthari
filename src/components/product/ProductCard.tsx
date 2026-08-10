'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/hooks/useT'
import AddToCartButton from './AddToCartButton'
import WishlistButton from './WishlistButton'
import type { Product } from '@/types/database.types'

interface ProductCardProps {
  product: Product
  className?: string
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const { tField } = useT()
  const name = tField(product.name, product.name_or)
  const unit = tField(product.unit, product.unit_or)

  const discount =
    product.mrp && product.mrp > product.price
      ? Math.round((1 - product.price / product.mrp) * 100)
      : null

  const outOfStock = product.stock_qty === 0

  return (
    <div
      className={cn(
        'w-40 md:w-48 flex-shrink-0 bg-surface-card rounded-2xl border border-table-border/70 flex flex-col group relative overflow-hidden',
        'shadow-[0_2px_10px_rgba(27, 44, 61,0.05)] hover:shadow-[0_14px_30px_rgba(27, 44, 61,0.14)] hover:-translate-y-1.5 transition-all duration-300 ease-out',
        className,
      )}
    >
      <Link href={`/product/${product.slug}`} className="block flex-1 relative z-10">
        {/* ── Square image ── */}
        <div className="relative aspect-square w-full bg-gradient-to-br from-surface-container-low to-surface-container overflow-hidden">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              sizes="(max-width: 768px) 160px, 192px"
              className="object-contain p-5 mix-blend-multiply group-hover:scale-[1.08] transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="text-on-surface-variant/25" size={34} />
            </div>
          )}

          {/* Discount badge */}
          {discount && !outOfStock && (
            <span className="absolute top-2.5 left-2.5 bg-primary text-on-primary text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm tracking-wide">
              {discount}% OFF
            </span>
          )}

          {/* Wishlist heart */}
          <div className="absolute top-2.5 right-2.5 z-20">
            <WishlistButton productId={product.id} />
          </div>

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-white px-3 py-1.5 rounded-full shadow-md">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="px-3.5 pt-3 pb-1.5 flex flex-col gap-0.5">
          {/* Brand — small muted label above the name.
              /80 not /60: 4.94:1 vs 3.05:1 on the white card (WCAG AA). */}
          {product.brand && (
            <p className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-[0.12em] truncate">
              {product.brand}
            </p>
          )}

          {/* Product name — 2-line clamp */}
          <h4 className="text-[13px] md:text-sm font-bold text-primary leading-snug line-clamp-2 min-h-[36px]">
            {name}
          </h4>

          {/* Unit — muted pill-ish label */}
          <p className="text-[11px] font-semibold text-on-surface-variant/80">{unit}</p>

          {/* Units per box — only for box-sold products with a real pack size */}
          {product.pack_type === 'Box' && product.units_per_pack ? (
            <p className="text-[10px] font-bold text-on-surface-variant/55">
              {tField(`${product.units_per_pack} units/box`, `ବାକ୍ସ ପିଛା ${product.units_per_pack} ୟୁନିଟ୍`)}
            </p>
          ) : null}

          {/* Price row */}
          <div className="flex items-baseline gap-1.5 flex-wrap mt-1.5">
            <span className="text-[17px] font-black text-primary tracking-tight">₹{product.price}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-[11px] text-on-surface-variant/60 line-through font-semibold">₹{product.mrp}</span>
            )}
            {discount && (
              <span className="text-[10px] font-black text-success">Save {discount}%</span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Add to cart — always at bottom ── */}
      <div className="px-3 pb-3 pt-1.5 mt-auto">
        <AddToCartButton
          product={product}
          variant="full"
          disabled={outOfStock}
        />
      </div>
    </div>
  )
}
