'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Minus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useAuthPromptStore } from '@/store/authPromptStore'
import { useOverlayStore } from '@/store/overlayStore'
import { useFlyToCartStore } from '@/store/flyToCartStore'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { useT } from '@/hooks/useT'
import { cn } from '@/lib/utils'
import { getBuyOptions, pluralLabelOf, minQtyFor, bulkMinPieces, hasRetailPrice } from '@/lib/products/packaging'
import type { Product } from '@/types/database.types'

interface Props {
  product: Product
  className?: string
  /** "icon" — small circle ADD (default, for product detail etc.)
   *  "full" — full-width ADD button with text + stepper */
  variant?: 'icon' | 'full'
  disabled?: boolean
}

// "Box" -> "Boxes", "Bottle" -> "Bottles". Handles the sibilant endings a naive
// +"s" gets wrong ("Box" -> "Boxs").
function pluralize(word: string): string {
  return /(?:s|x|z|ch|sh)$/i.test(word) ? `${word}es` : `${word}s`
}

export default function AddToCartButton({ product, className, variant = 'icon', disabled }: Props) {
  const addItem       = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const showAuthPrompt = useAuthPromptStore((s) => s.show)
  const { isSignedIn, isLoaded } = useSupabaseUser()
  const [flash, setFlash] = useState(false)
  const { t, tField } = useT()
  // Anchor for the fly-to-cart animation — whichever visual (icon button or
  // full-width button) is on screen sets this, so addToCart() has a fixed
  // point to launch the flight from regardless of which variant/flow added.
  const anchorRef = useRef<HTMLElement | null>(null)

  // The levels this product can be bought at — e.g. Box, or Hanger/Pack for
  // spices. Same source of truth as the product page, so prices and unit counts
  // can't drift apart between the two.
  const buyOptions = getBuyOptions(product)
  const hasLevels = buyOptions.length > 1
  const [levelIdx, setLevelIdx] = useState(0)
  const opt = buyOptions[Math.min(levelIdx, buyOptions.length - 1)]

  // Every product gets a Blinkit-style quick-pick sheet (1 / 10 / custom) on the
  // first ADD, so the customer chooses how many units to add instead of always
  // starting at one. After it's in the cart the button becomes a +/- stepper.
  // Pieces contained in ONE of the selected level. Only fall back to
  // units_per_pack for single-level products that name a pack_type, where it
  // legacy-means pieces-per-box. Once a product HAS levels, units_per_pack counts
  // lower units (e.g. 20 hangers per box), not pieces — printing it against the
  // lower unit's label claims "1 Hanger = 1,200 pieces". Better to show no count
  // than a wrong one, so this is 0 (hidden) when there's nothing meaningful.
  const unitsPerBox = opt.pieces ?? (hasLevels ? 0 : (product.pack_type ? product.units_per_pack : 0)) ?? 0
  const pricePerBox = opt.price
  // "Box" / "Hanger" / "Pack" for multi-level products; for a single-level
  // product use its own pack_type ("Bottle", "Bag", "Piece"…), falling back to a
  // plain "unit" when it names none — so the sheet reads correctly for every
  // product, not just boxes. "Box" keeps its Odia translation (the common case).
  const isBoxUnit = !hasLevels && (product.pack_type ?? '').toLowerCase() === 'box'
  const unitWord = hasLevels
    ? opt.label
    : isBoxUnit
      ? tField('Box', 'ବାକ୍ସ')
      : (product.pack_type || tField('unit', 'ୟୁନିଟ୍'))
  const unitWordPlural = hasLevels
    ? pluralLabelOf(opt)
    : isBoxUnit
      ? tField('Boxes', 'ବାକ୍ସ')
      : (product.pack_type ? pluralize(product.pack_type) : tField('units', 'ୟୁନିଟ୍'))
  const maxQty = product.stock_qty > 0 ? product.stock_qty : 9999
  // Bulk price needs a minimum number of pieces (admin-set per product).
  const minQty = minQtyFor(product, opt)
  const minPieces = bulkMinPieces(product)
  const clampNum = (n: number) => Math.max(minQty, Math.min(Math.floor(n), maxQty))

  // Each level is its own cart line (a Hanger and a Pack are separate).
  const lineId = hasLevels ? `${product.id}::${opt.label}` : product.id
  const cartItem = useCartStore((s) => s.items.find((i) => i.id === lineId))

  const [showSheet, setShowSheet] = useState(false)
  const [qtyStr, setQtyStr] = useState('1')
  // Picking a bulk level in the sheet lifts the quantity to its minimum.
  const [lastMin, setLastMin] = useState(minQty)
  if (lastMin !== minQty) {
    setLastMin(minQty)
    if ((parseInt(qtyStr || '1', 10) || 1) < minQty) setQtyStr(String(minQty))
  }
  const qtyNum = clampNum(parseInt(qtyStr || '1', 10) || 1)

  // Portal target only exists on the client.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const pushOverlay = useOverlayStore((s) => s.push)
  const popOverlay = useOverlayStore((s) => s.pop)

  // While the sheet is open: lock background scroll and mark an overlay open
  // (so the floating WhatsApp button hides). The sheet itself is portaled to
  // <body> so it escapes the card's transformed stacking context.
  useEffect(() => {
    if (!showSheet) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    pushOverlay()
    return () => {
      document.body.style.overflow = prev
      popOverlay()
    }
  }, [showSheet, pushOverlay, popOverlay])

  const requireAuth = () => {
    if (isLoaded && !isSignedIn) { showAuthPrompt(); return false }
    return true
  }

  const addToCart = (quantity: number) => {
    addItem({
      id: lineId,
      product_id: product.id,
      // Mirrors ProductBuyPanel so the cart line and the server-side price
      // lookup agree on which level was bought.
      variant: hasLevels ? opt.label : null,
      name: product.name,
      price: hasLevels ? opt.price : product.price,
      mrp: hasLevels ? opt.mrp : product.mrp,
      unit: hasLevels
        ? (opt.pieces ? `${opt.label} · ${opt.pieces} pieces` : opt.label)
        : product.unit,
      units_each: hasLevels ? (opt.pieces ?? undefined) : undefined,
      image: product.images?.[0] ?? null,
      slug: product.slug,
      min_qty: minQty > 1 ? minQty : undefined,
    })
    quantity = Math.max(minQty, quantity)
    if (quantity > 1) updateQuantity(lineId, quantity)
    useFlyToCartStore.getState().launch(product.images?.[0] ?? null, anchorRef.current)
    setFlash(true)
    setTimeout(() => setFlash(false), 800)
  }

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    if (!requireAuth()) return
    // Ask "how many?" before the first add for every product.
    if (!cartItem) {
      setQtyStr(String(minQty))
      setShowSheet(true)
      return
    }
    addToCart(1)
  }

  const confirmSheet = () => {
    addToCart(qtyNum)
    setShowSheet(false)
  }

  const handleChange = (e: React.MouseEvent, delta: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!cartItem) return
    const next = cartItem.quantity + delta
    // Below the bulk minimum the line comes out rather than sitting at a price
    // the customer no longer qualifies for.
    updateQuantity(cartItem.id, next < (cartItem.min_qty ?? 1) ? 0 : next)
  }

  const fmt = (n: number) => n.toLocaleString('en-IN')

  // ── Quick-pick bottom sheet (box products) ──────────────────────────────────
  const sheet = (
    <AnimatePresence>
      {showSheet && (
        <motion.div
          key="box-sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSheet(false) }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            className="relative w-full max-w-md bg-surface rounded-t-3xl p-5 shadow-2xl max-h-[92dvh] overflow-y-auto overscroll-contain"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto w-10 h-1.5 rounded-full bg-outline-variant/40 mb-4" />

            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.images?.[0] ?? ''} alt="" className="w-12 h-12 rounded-lg object-contain bg-surface-container flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-primary leading-tight line-clamp-2">{tField(product.name, product.name_or)}</p>
                <p className="text-[11px] font-bold text-on-surface-variant/60 mt-0.5">
                  {unitsPerBox ? `${fmt(unitsPerBox)} units/${unitWord} · ` : ''}₹{fmt(pricePerBox)}/{unitWord}
                </p>
              </div>
              <button onClick={() => setShowSheet(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:text-primary transition-colors flex-shrink-0" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {/* Level picker — e.g. Hanger vs Pack for spices. */}
            {hasLevels && (
              <>
                <p className="text-[13px] font-semibold text-on-surface-variant/60 mb-2">
                  {tField('Buy by', 'କିଣନ୍ତୁ')}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {buyOptions.map((o, i) => {
                    const sel = i === levelIdx
                    return (
                      <button
                        key={o.label}
                        onClick={() => { setLevelIdx(i); setQtyStr('1') }}
                        aria-pressed={sel}
                        className={cn(
                          'flex flex-col items-start gap-0.5 rounded-2xl border-2 p-3 text-left transition active:scale-95',
                          sel ? 'border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(27, 44, 61,0.06)]' : 'border-table-border hover:border-primary/40',
                        )}
                      >
                        <span className="font-black text-sm text-primary">{o.label}</span>
                        <span className="font-black text-base text-primary">₹{fmt(o.price)}</span>
                        {o.pieces != null && (
                          <span className="text-[12px] font-bold text-on-surface-variant/60">{fmt(o.pieces)} {tField('units', 'ୟୁନିଟ୍')}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {minQty > 1 && (
              <div className="mb-3 rounded-xl border-2 border-secondary/40 bg-secondary-container/60 px-3 py-2.5" role="status">
                <p className="text-[14px] font-bold text-primary">{hasRetailPrice(product) ? `Bulk price from ${minPieces} pieces` : `Minimum order: ${minPieces} pieces`}</p>
                <p className="text-[13px] text-on-surface-variant">
                  Order at least {minQty} {minQty === 1 ? unitWord : unitWordPlural} for this price.
                </p>
              </div>
            )}

            <p className="text-[13px] font-semibold text-on-surface-variant/60 mb-2">
              {`Select quantity`}
            </p>

            {/* Quick options: 1 box / 10 boxes */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {(minQty > 1 ? [minQty, minQty * 2] : [1, 10]).map((n) => {
                const sel = qtyStr === String(n)
                return (
                  <button
                    key={n}
                    onClick={() => setQtyStr(String(n))}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-2xl border-2 p-3 text-left transition active:scale-95',
                      sel ? 'border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(27, 44, 61,0.06)]' : 'border-table-border hover:border-primary/40',
                    )}
                  >
                    <span className="font-black text-sm text-primary">{n} {n === 1 ? unitWord : unitWordPlural}</span>
                    <span className="font-black text-base text-primary">₹{fmt(n * pricePerBox)}</span>
                    {unitsPerBox > 0 && (
                      <span className="text-[12px] font-bold text-on-surface-variant/60">{fmt(n * unitsPerBox)} {tField('units', 'ୟୁନିଟ୍')}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Custom number of boxes */}
            <div className="rounded-2xl border-2 border-primary/25 bg-primary/[0.04] p-3 mb-4">
              <label htmlFor="box-sheet-custom" className="block text-[13px] font-semibold text-primary mb-2">
                {`Or enter a custom quantity`}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="box-sheet-custom"
                  type="text"
                  inputMode="numeric"
                  value={qtyStr}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setQtyStr(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => setQtyStr(String(qtyNum))}
                  placeholder="100"
                  aria-label={`Number of ${unitWordPlural}`}
                  className="w-24 h-12 px-3 rounded-xl border-2 border-primary/40 bg-surface text-center font-black text-lg text-primary placeholder:text-on-surface-variant/30 outline-none focus:border-primary"
                />
                <span className="text-sm font-bold text-on-surface-variant">{unitWordPlural}</span>
                <div className="ml-auto text-right">
                  <p className="text-[13px] font-semibold text-on-surface-variant/50">{tField('Total', 'ମୋଟ')}</p>
                  <p className="text-xl font-black text-primary leading-none mt-0.5">₹{fmt(qtyNum * pricePerBox)}</p>
                </div>
              </div>
            </div>

            {/* Confirm */}
            <button
              onClick={confirmSheet}
              className="btn-pill w-full h-12"
            >
              {`Add ${qtyNum} ${qtyNum === 1 ? unitWord : unitWordPlural}`} · ₹{fmt(qtyNum * pricePerBox)}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // ── Full-width variant ─────────────────────────────────────────────────────
  if (variant === 'full') {
    return (
      <>
      <div
        ref={(el) => { anchorRef.current = el }}
        className={cn('relative h-11', className)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {cartItem ? (
            // Stepper
            <motion.div
              key="stepper"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-between rounded-full bg-ink text-paper-raised overflow-hidden"
            >
              <button
                onClick={(e) => handleChange(e, -1)}
                className="w-11 h-full flex items-center justify-center bg-transparent hover:bg-indigo hover:text-paper-raised transition-colors active:scale-95"
                aria-label="Remove one"
              >
                <Minus size={16} strokeWidth={3} />
              </button>
              <span className="text-[15px] font-bold min-w-6 text-center tabular-nums" aria-live="polite">
                {cartItem.quantity}
              </span>
              <button
                onClick={(e) => handleChange(e, 1)}
                className="w-11 h-full flex items-center justify-center bg-transparent hover:bg-indigo hover:text-paper-raised transition-colors active:scale-95"
                aria-label="Add one more"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </motion.div>
          ) : (
            // ADD button
            <motion.button
              key="add"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={handleAdd}
              disabled={disabled}
              className={cn(
                'absolute inset-0 overflow-hidden flex items-center justify-center gap-2 rounded-full font-semibold text-[15px] transition-[background-color,transform] duration-300 active:scale-95 group/btn',
                disabled
                  ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-50'
                  : flash
                  ? 'bg-periwinkle text-ink'
                  : 'bg-ink text-paper-raised hover:bg-indigo hover:text-paper-raised',
              )}
              aria-label={t('product.addToCart')}
            >
              <Plus size={15} strokeWidth={2.5} className="transition-transform duration-300 group-hover/btn:rotate-90" />
              Add to bag
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {mounted && createPortal(sheet, document.body)}
      </>
    )
  }

  // ── Icon variant (default — small circle) ───────────────────────────────────
  if (cartItem) {
    return (
      <div
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        className={cn('flex items-center justify-between bg-ink rounded-full px-1 py-1 min-w-[100px]', className)}
      >
        <button
          onClick={(e) => handleChange(e, -1)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-paper-raised hover:bg-indigo hover:text-paper-raised transition-colors" aria-label="Remove one"
        >
          <Minus size={14} />
        </button>
        <span className="text-sm font-bold text-paper-raised min-w-6 text-center tabular-nums">
          {cartItem.quantity}
        </span>
        <button
          onClick={(e) => handleChange(e, 1)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-paper-raised hover:bg-indigo hover:text-paper-raised transition-colors" aria-label="Add one more"
        >
          <Plus size={14} />
        </button>
      </div>
    )
  }

  return (
    <>
    <button
      ref={(el) => { anchorRef.current = el }}
      onClick={handleAdd}
      disabled={disabled}
      className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95',
        disabled
          ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
          : flash
          ? 'bg-primary-fixed text-primary'
          : 'bg-ink text-paper-raised hover:bg-indigo hover:text-paper-raised',
        className,
      )}
      aria-label={t('product.addToCart')}
    >
      <Plus size={18} />
    </button>
    {mounted && createPortal(sheet, document.body)}
    </>
  )
}
