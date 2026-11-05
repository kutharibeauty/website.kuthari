-- ════════════════════════════════════════════════════════════════════════════
-- 044 · Bulk-price minimum per product
-- ════════════════════════════════════════════════════════════════════════════
-- For products sold at both a retail and a bulk price: the fewest pieces a
-- customer must buy to get the bulk price (Admin → Products → "Bulk price from").
-- NULL = no minimum. Additive only; no existing row changes.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bulk_min_qty integer
  CHECK (bulk_min_qty IS NULL OR bulk_min_qty >= 1);
