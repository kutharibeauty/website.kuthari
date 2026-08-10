-- ─────────────────────────────────────────────────────────────────────────────
-- Spices packaging: hanger / pack.
-- For products in the Spices category, the buyer chooses a number of HANGERS or
-- PACKS instead of weight/size variants. Each product defines:
--   • units_per_hanger — how many single units make one hanger
--   • hangers_per_pack — how many hangers make one pack
-- Price basis: the product's `price` is the price per HANGER; a pack's price is
-- computed as hangers_per_pack × price. Total units = quantity × units for the
-- chosen packaging.
--
-- Additive & idempotent; safe on the drifted live schema. Non-spice products
-- leave these NULL and are unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS units_per_hanger INTEGER,
  ADD COLUMN IF NOT EXISTS hangers_per_pack INTEGER;
