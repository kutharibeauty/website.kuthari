'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthPromptStore } from '@/store/authPromptStore'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { cn } from '@/lib/utils'
import { useT } from '@/hooks/useT'
import { retailOption, bulkBuyOptions, describeSelection, type BuyOption } from '@/lib/products/packaging'
import type { Product } from '@/types/database.types'

/**
 * Client purchase panel: buy-mode picker + pricing box + add-to-cart / buy-now
 * (desktop inline + mobile sticky).
 *
 * Retail-first two-step selection:
 *   1. Single piece  or  Bulk        (step hidden when there is no retail price)
 *   2. if Bulk and the product has more than one bulk unit — Box / Pack / Hanger
 *
 * Price, MRP and unit all follow the selection, and the cart line is keyed by it
 * so a Single and a Box are separate lines.
 */
export default function ProductBuyPanel({ product }: { product: Product }) {
  const retail = retailOption(product)
  const bulkOptions = bulkBuyOptions(product)
  const hasRetail = !!retail
  const hasBulkChoice = bulkOptions.length > 1

  // Which bulk unit is selected (only meaningful in bulk mode).
  const [bulkIdx, setBulkIdx] = useState(0)
  // Retail-first: default to Single whenever a retail price exists.
  const [mode, setMode] = useState<'single' | 'bulk'>(hasRetail ? 'single' : 'bulk')

  const activeBulk: BuyOption = bulkOptions[Math.min(bulkIdx, bulkOptions.length - 1)]
  const activeOption: BuyOption = mode === 'single' && retail ? retail : activeBulk
  // True whenever the selection carries a unit label worth showing (i.e. not a
  // plain single-price product with no packaging at all).
  const hasLevels = hasRetail || hasBulkChoice || !!product.pack_type

  const [qty, setQty] = useState(1)
  // Separate string state for the typed field so it can be cleared/empty while
  // editing (the numeric qty stays ≥1; we normalize the text on blur).
  const [qtyInput, setQtyInput] = useState('1')

  // Pieces contained in ONE of the selected unit (null until the admin sets it).
  const piecesEach = activeOption.pieces

  const price = activeOption.price
  const mrp = activeOption.mrp
  const unit = activeOption.label
  const discount = mrp && mrp > price ? Math.round((1 - price / mrp) * 100) : null
  const outOfStock = product.stock_qty === 0

  const packLabel = activeOption.label
  const innerUnitLabel = 'Pieces'
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

  // Each buy option is its own cart line (a Single and a Box are separate).
  const lineId = hasLevels ? `${product.id}::${activeOption.label}` : product.id
  const cartItem = useCartStore((s) => s.items.find((i) => i.id === lineId))

  const buildItem = () => ({
    id: lineId,
    product_id: product.id,
    variant: hasLevels ? activeOption.label : null,
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

      {/* ── Step 1: Single piece vs Bulk ──
           Retail-first, so this is the primary decision. Hidden entirely when
           the product has no retail price (bulk-only), leaving step 2 alone. */}
      {hasRetail && retail && (
        <div className="mb-5">
          <p className="block text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60 mb-3">
            How would you like to buy?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'single' as const, tag: 'Retail', title: 'Single Piece', opt: retail },
              { key: 'bulk' as const, tag: 'Bulk', title: hasBulkChoice ? 'Choose a pack' : activeBulk.label, opt: activeBulk },
            ]).map(({ key, tag, title, opt }) => {
              const sel = mode === key
              const off = opt.mrp && opt.mrp > opt.price ? Math.round((1 - opt.price / opt.mrp) * 100) : null
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  aria-pressed={sel}
                  className={cn(
                    'group relative flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left overflow-hidden',
                    'transition-all duration-200 ease-out active:scale-[0.97] hover:-translate-y-0.5',
                    sel
                      ? 'border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(27,44,61,0.06)]'
                      : 'border-table-border hover:border-primary/40 hover:shadow-sm',
                  )}
                >
                  {/* Selected tick */}
                  <span
                    className={cn(
                      'absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black',
                      'transition-all duration-200',
                      sel ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                    )}
                  >
                    ✓
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">{tag}</span>
                  <span className="font-black text-sm text-primary">{title}</span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-black text-lg text-primary">₹{opt.price.toLocaleString('en-IN')}</span>
                    {opt.mrp != null && opt.mrp > opt.price && (
                      <span className="text-[11px] font-bold text-on-surface-variant/50 line-through">
                        ₹{opt.mrp.toLocaleString('en-IN')}
                      </span>
                    )}
                  </span>
                  {off != null && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-success">{off}% off</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Step 2: which bulk unit ──
           Only when buying bulk AND the admin configured more than one bulk
           unit for this product (e.g. Box and Hanger). */}
      {mode === 'bulk' && hasBulkChoice && (
        <div className="mb-6 animate-drop-in">
          <p className="block text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60 mb-3">
            Choose your bulk pack
          </p>
          <div className="grid grid-cols-2 gap-3">
            {bulkOptions.map((opt, i) => {
              const sel = i === bulkIdx
              const off = opt.mrp && opt.mrp > opt.price ? Math.round((1 - opt.price / opt.mrp) * 100) : null
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setBulkIdx(i)}
                  aria-pressed={sel}
                  className={cn(
                    'relative flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left',
                    'transition-all duration-200 ease-out active:scale-[0.97] hover:-translate-y-0.5',
                    sel
                      ? 'border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(27,44,61,0.06)]'
                      : 'border-table-border hover:border-primary/40 hover:shadow-sm',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black',
                      'transition-all duration-200',
                      sel ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                    )}
                  >
                    ✓
                  </span>
                  <span className="font-black text-sm text-primary">{opt.label}</span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-black text-lg text-primary">₹{opt.price.toLocaleString('en-IN')}</span>
                    {opt.mrp != null && opt.mrp > opt.price && (
                      <span className="text-[11px] font-bold text-on-surface-variant/50 line-through">
                        ₹{opt.mrp.toLocaleString('en-IN')}
                      </span>
                    )}
                  </span>
                  {off != null && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-success">{off}% off</span>
                  )}
                  {opt.pieces != null && (
                    <span className="text-[10px] font-bold text-on-surface-variant/60">
                      {opt.pieces.toLocaleString('en-IN')} pieces
                    </span>
                  )}
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
        {!hasLevels && (
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
