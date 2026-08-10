'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Minus, ChevronDown } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthPromptStore } from '@/store/authPromptStore'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { cn } from '@/lib/utils'
import { useT } from '@/hooks/useT'
import { getBuyOptions, describeSelection, type BuyOption } from '@/lib/products/packaging'
import type { Product, ProductVariant } from '@/types/database.types'

/**
 * Client purchase panel: pricing box + weight/size variant selector + add-to-cart
 * / buy-now (desktop inline + mobile sticky). Price, MRP and unit all follow the
 * selected variant; the cart line is keyed per variant so 5kg and 10kg are
 * separate lines.
 */
export default function ProductBuyPanel({ product }: { product: Product }) {
  // Packaging levels the customer may buy at: the box, and (when configured) the
  // lower unit — Hanger / Pack / Tin. Never single pieces.
  const buyOptions = getBuyOptions(product)
  const hasLevels = buyOptions.length > 1
  const [levelIdx, setLevelIdx] = useState(0)
  const activeOption: BuyOption = buyOptions[Math.min(levelIdx, buyOptions.length - 1)]

  // Weight/size variants (legacy) only apply when there's no packaging split.
  const variants: ProductVariant[] = hasLevels ? [] : (product.variants ?? [])
  const hasVariants = variants.length > 0
  const [selIdx, setSelIdx] = useState(0)
  const [qty, setQty] = useState(1)
  // Separate string state for the typed field so it can be cleared/empty while
  // editing (the numeric qty stays ≥1; we normalize the text on blur).
  const [qtyInput, setQtyInput] = useState('1')
  const active: ProductVariant | null = hasVariants ? variants[Math.min(selIdx, variants.length - 1)] : null

  // Pieces contained in ONE of the selected unit (null until the admin sets it).
  const piecesEach = activeOption.pieces

  const price = hasLevels ? activeOption.price : (active?.price ?? product.price)
  const mrp = hasLevels ? activeOption.mrp : (active?.mrp ?? product.mrp)
  const unit = hasLevels ? activeOption.label : (active?.label ?? product.unit)
  const discount = mrp && mrp > price ? Math.round((1 - price / mrp) * 100) : null
  const outOfStock = product.stock_qty === 0

  const packLabel = activeOption.label
  const innerUnitLabel = 'Pieces'
  // Show the "Buy unit" dropdown for packaging-based products — those sold by a
  // named unit (Box / Hanger / Pack …). Legacy weight/size products keep their
  // own "Select pack size" cards, so they're excluded here.
  const showUnitPicker = !hasVariants && (hasLevels || !!product.pack_type)
  // Clamp any typed quantity to available stock (never accept an invalid amount).
  const clampQty = (n: number) => {
    if (!Number.isFinite(n) || n < 1) return 1
    if (product.stock_qty <= 0) return 1
    return Math.min(Math.floor(n), product.stock_qty)
  }

  const { tField } = useT()
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const showAuthPrompt = useAuthPromptStore((s) => s.show)
  const { isSignedIn, isLoaded } = useSupabaseUser()

  // Each packaging level is its own cart line (a Box and a Hanger are separate).
  const lineId = hasLevels
    ? `${product.id}::${activeOption.label}`
    : active ? `${product.id}::${active.label}` : product.id
  const cartItem = useCartStore((s) => s.items.find((i) => i.id === lineId))

  const buildItem = () => ({
    id: lineId,
    product_id: product.id,
    variant: hasLevels ? activeOption.label : (active?.label ?? null),
    name: product.name,
    price,
    mrp,
    unit: hasLevels
      ? (piecesEach ? `${activeOption.label} · ${piecesEach} pieces` : activeOption.label)
      : unit,
    units_each: hasLevels ? (piecesEach ?? undefined) : undefined,
    image: product.images?.[0] ?? null,
    slug: product.slug,
    delivery_charge: product.delivery_charge_enabled ? (product.delivery_charge ?? 0) : 0,
  })

  const requireAuth = () => {
    if (isLoaded && !isSignedIn) { showAuthPrompt(); return false }
    return true
  }
  // Add the typed quantity in one action (PRD #1) — respects the stock clamp.
  const handleAdd = () => {
    if (outOfStock || !requireAuth()) return
    addItem(buildItem())
    const n = clampQty(qty)
    if (n > 1) updateQuantity(lineId, n)
  }
  const handleBuyNow = () => {
    if (outOfStock || !requireAuth()) return
    if (!cartItem) {
      addItem(buildItem())
      const n = clampQty(qty)
      if (n > 1) updateQuantity(lineId, n)
    }
    router.push('/checkout')
  }

  // Current effective quantity (cart line if present, else the pre-add qty).
  const currentQty = cartItem?.quantity ?? qty
  const setQtyValue = (v: number) => { if (cartItem) updateQuantity(lineId, v); else setQty(v) }
  // Keep the typed field's text in sync when qty changes via the +/- stepper.
  useEffect(() => { setQtyInput(String(cartItem?.quantity ?? qty)) }, [cartItem?.quantity, qty])

  // Shared add / stepper control.
  const AddControl = ({ full }: { full?: boolean }) =>
    cartItem ? (
      <div className={cn('flex items-center justify-between bg-primary text-white rounded-full h-12 px-1', full && 'flex-1')}>
        <button onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)} className="w-11 h-full flex items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition" aria-label="Remove one">
          <Minus size={16} strokeWidth={3} />
        </button>
        {/* Typed quantity — enter e.g. 100 boxes in one action instead of tapping +1 (PRD #1). */}
        <input
          type="number"
          min={1}
          max={product.stock_qty || undefined}
          value={cartItem.quantity}
          onChange={(e) => { const n = parseInt(e.target.value, 10); updateQuantity(cartItem.id, clampQty(Number.isNaN(n) ? 1 : n)) }}
          aria-label={hasLevels ? `Number of ${packLabel}` : 'Quantity'}
          className="w-14 bg-transparent text-center font-black text-sm tracking-widest outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button onClick={() => updateQuantity(cartItem.id, clampQty(cartItem.quantity + 1))} className="w-11 h-full flex items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition" aria-label="Add one more">
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>
    ) : (
      <button
        onClick={handleAdd}
        disabled={outOfStock}
        className={cn(
          'h-12 px-6 rounded-full border-2 border-primary text-primary font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          full && 'flex-1',
        )}
      >
        <ShoppingCart size={16} /> Add
      </button>
    )

  return (
    <>
      {/* ── Pricing box ── */}
      <div className="bg-gradient-to-br from-surface-container-low to-surface-container border border-table-border/70 rounded-2xl p-5 mb-5 relative overflow-hidden shadow-[0_2px_14px_rgba(27, 44, 61,0.06)]">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle,#000_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/50 mb-2">
            Price per {unit}
          </p>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-primary tracking-tight">₹{price}</span>
              {mrp && mrp > price && (
                <span className="text-base font-medium text-on-surface-variant/40 line-through">₹{mrp}</span>
              )}
            </div>
            {discount && (
              <div className="bg-primary text-white font-black text-sm px-3 py-1.5 rounded-xl flex-shrink-0">Save {discount}%</div>
            )}
          </div>

          {/* Units contained in one pack — shown for pack-sold products. */}
          {hasLevels && piecesEach != null && (
            <p className="mt-2 text-[12px] font-bold text-on-surface-variant/75">
              {`1 ${packLabel} = ${piecesEach.toLocaleString('en-IN')} ${innerUnitLabel}`}
              {product.price_per_pack ? (
                <span className="text-primary">{` · ₹${product.price_per_pack}/${packLabel}`}</span>
              ) : null}
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-table-border">
            {outOfStock ? (
              <p className="text-[11px] font-black uppercase tracking-widest text-error flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-error" /> Out of Stock
              </p>
            ) : (
              <p className="text-[11px] font-black uppercase tracking-widest text-success flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" /> In Stock
                {product.stock_qty <= 10 && <span className="text-error font-black ml-1">— only {product.stock_qty} left</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Buy unit: Box / Hanger / Pack (dropdown) ── */}
      {showUnitPicker && (
        <div className="mb-6">
          <label htmlFor="buy-unit" className="block text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60 mb-3">
            {tField('Buy unit', 'କିଣିବା ୟୁନିଟ୍')}
          </label>
          <div className="relative">
            <select
              id="buy-unit"
              value={levelIdx}
              onChange={(e) => setLevelIdx(parseInt(e.target.value, 10))}
              className="w-full h-14 pl-4 pr-11 rounded-2xl border-2 border-table-border bg-surface font-black text-sm text-primary appearance-none outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {buyOptions.map((opt, i) => (
                <option key={opt.label} value={i}>
                  {opt.label} — ₹{opt.price}
                  {opt.pieces != null ? ` · ${opt.pieces.toLocaleString('en-IN')} pieces` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          </div>
        </div>
      )}

      {/* ── Variant selector (pack-size cards with discount badge) ── */}
      {hasVariants && (
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60 mb-3">Select pack size</p>
          <div className="flex flex-wrap gap-3">
            {variants.map((v, i) => {
              const isSel = i === selIdx
              const vDiscount = v.mrp && v.mrp > v.price ? Math.round((1 - v.price / v.mrp) * 100) : null
              return (
                <button
                  key={`${v.label}-${i}`}
                  onClick={() => setSelIdx(i)}
                  aria-pressed={isSel}
                  className={cn(
                    'relative flex flex-col items-center gap-1 min-w-[108px] px-4 pt-4 pb-3 rounded-2xl border-2 transition-all duration-200 active:scale-95',
                    isSel
                      ? 'border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(27, 44, 61,0.06)]'
                      : 'border-table-border hover:border-primary/40',
                  )}
                >
                  {vDiscount && (
                    <span
                      className={cn(
                        'absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide shadow-sm',
                        isSel ? 'bg-primary text-white' : 'bg-secondary text-on-secondary',
                      )}
                    >
                      {vDiscount}% OFF
                    </span>
                  )}

                  {/* Selected tick */}
                  {isSel && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[9px] font-black">✓</span>
                  )}

                  <span className={cn('font-black text-sm', isSel ? 'text-primary' : 'text-on-surface')}>{v.label}</span>
                  <span className="flex items-baseline gap-1.5">
                    <span className={cn('font-black text-base', isSel ? 'text-primary' : 'text-on-surface')}>₹{v.price}</span>
                    {v.mrp && v.mrp > v.price && (
                      <span className="text-xs text-on-surface-variant/40 line-through">₹{v.mrp}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Quantity / Boxes: +/- stepper + explicit typed field + live total (PRD #1) ── */}
      {!outOfStock && (
        <div className="mb-5 rounded-2xl border-2 border-table-border p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60 mb-3">
            {hasLevels ? `Number of ${packLabel}s` : tField('Quantity', 'ପରିମାଣ')}
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            {/* +/- stepper */}
            <div className="inline-flex items-center h-12 rounded-full border-2 border-table-border overflow-hidden">
              <button type="button" onClick={() => setQtyValue(Math.max(1, currentQty - 1))} className="w-12 h-full flex items-center justify-center text-primary hover:bg-surface-container active:scale-95 transition" aria-label="Decrease">
                <Minus size={16} strokeWidth={3} />
              </button>
              <span className="w-12 text-center font-black text-base text-primary tabular-nums">{currentQty}</span>
              <button type="button" onClick={() => setQtyValue(clampQty(currentQty + 1))} className="w-12 h-full flex items-center justify-center text-primary hover:bg-surface-container active:scale-95 transition" aria-label="Increase">
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>

            {/* Explicit "or type an exact number" field — obvious to new users.
                Uses a separate string state so it can be cleared while typing;
                selects all on focus so typing replaces instead of appending. */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-on-surface-variant/60">{tField('or type', 'କିମ୍ବା ଲେଖନ୍ତୁ')}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={product.stock_qty || undefined}
                value={qtyInput}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  const raw = e.target.value
                  setQtyInput(raw)
                  const parsed = parseInt(raw, 10)
                  if (!Number.isNaN(parsed) && parsed >= 1) setQtyValue(clampQty(parsed))
                }}
                onBlur={() => { const n = parseInt(qtyInput, 10); if (Number.isNaN(n) || n < 1) setQtyInput(String(currentQty)) }}
                placeholder={hasLevels ? '10' : '10'}
                aria-label={hasLevels ? `Type number of ${packLabel}` : 'Type quantity'}
                className="w-24 h-12 px-3 rounded-xl border-2 border-primary/40 bg-surface text-center font-black text-lg text-primary placeholder:text-on-surface-variant/30 outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {hasLevels && <span className="text-sm font-bold text-on-surface-variant">{packLabel}s</span>}
            </div>
          </div>

          {/* Live auto-calculated total amount — updates as you type */}
          <div className="mt-4 pt-3 border-t border-table-border flex items-end justify-between gap-3">
            <div className="text-[11px] font-bold text-on-surface-variant/70 leading-snug">
              <span>{currentQty} × ₹{price}</span>
              {hasLevels ? (
                // e.g. "3 Hangers = 180 Pieces"
                <><br />{describeSelection(currentQty, activeOption, innerUnitLabel)}</>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">{tField('Total amount', 'ମୋଟ ରାଶି')}</p>
              <p className="text-2xl font-black text-primary tracking-tight leading-none mt-0.5">₹{(currentQty * price).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Badges ── */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {!hasVariants && !hasLevels && (
          <span className="px-3 py-1.5 border border-table-border rounded-xl font-black text-[11px] uppercase tracking-wider text-on-surface-variant">
            {product.unit}{product.unit_or && ` / ${product.unit_or}`}
          </span>
        )}
        {product.is_featured && (
          <span className="px-3 py-1.5 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-wider">Featured</span>
        )}
        {hasLevels && product.unit_type && product.units_per_pack && (
          <span className="px-3 py-1.5 border border-table-border rounded-xl font-black text-[11px] uppercase tracking-wider text-on-surface-variant">
            {`1 ${product.pack_type ?? 'Box'} = ${product.units_per_pack} ${product.unit_type}s`}
            {product.pieces_per_secondary ? ` × ${product.pieces_per_secondary} = ${(product.units_per_pack * product.pieces_per_secondary).toLocaleString('en-IN')} pieces` : ''}
          </span>
        )}
      </div>

      {/* ── Desktop actions ── */}
      <div className="hidden lg:flex gap-3">
        <AddControl full />
        <button
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="flex-1 h-12 px-6 rounded-full bg-primary text-white font-black text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Buy Now
        </button>
      </div>

      {/* ── Mobile sticky bar ──
          Pinned ABOVE the mobile bottom nav (h-16), not at bottom-0 where the
          nav (z-50) painted over it and hid the Add to Cart / Buy Now controls
          entirely — the reported "no add to cart button" bug. From md up the
          bottom nav is gone, so it drops back to the screen edge. */}
      <div
        className="fixed left-0 w-full bg-surface-container-lowest shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3 z-40 lg:hidden border-t border-outline-variant/30 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col leading-none">
          {/* Mirror the panel's "Total amount": the big number is qty × unit
              price, not the bare unit price. When more than one is selected the
              small line shows the "3 × ₹5,410" breakdown so the total reads
              correctly instead of "Box ₹16,230". */}
          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50">
            {currentQty > 1 ? `${currentQty} × ₹${price.toLocaleString('en-IN')}` : unit}
          </span>
          <span className="text-lg font-black text-primary">₹{(currentQty * price).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex-1 flex gap-2">
          <AddControl full />
          <button
            onClick={handleBuyNow}
            disabled={outOfStock}
            className="flex-1 h-12 rounded-full bg-primary text-white font-black text-sm uppercase tracking-wider active:scale-95 transition-transform shadow-sm disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
      </div>
    </>
  )
}
