-- ─────────────────────────────────────────────────────────────────────────────
-- Box → pack → unit packaging for non-spice products.
-- The admin defines a box's composition:
--   • packs_per_box  — how many packs are in one box
--   • units_per_pack — how many pieces/units are in one pack (already existed)
-- Total units in a box = packs_per_box × units_per_pack. The buyer orders boxes
-- and the cart shows the resulting total unit count.
--
-- Backward compatible: existing box products left packs_per_box NULL are treated
-- as 1 pack per box, so their total units stay = units_per_pack.
--
-- Additive & idempotent; safe on the drifted live schema.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS packs_per_box INTEGER;
