-- ── Wholesale pack/pricing fields (client catalog spec) ──────────────────────
-- Client's catalog spreadsheet: Full Product Name, Brand, Product Category,
-- Size/Weight, Packaging Form, Pack Type, Units per Pack, Unit Type,
-- Price per Pack, Price per Unit (auto-calculated).
--
-- Mapping to existing schema:
--   Full Product Name -> products.name        (existing)
--   Brand              -> products.brand       (existing column, was never
--                          surfaced in the app — now wired up)
--   Product Category   -> products.category_id (existing)
--   Size / Weight       -> products.unit        (existing, e.g. "850 g", "1 kg")
--   Price per Unit      -> products.price        (existing — the admin form
--                          now auto-computes this from price_per_pack /
--                          units_per_pack, so every existing price/cart/
--                          checkout/order code path is untouched)
--
-- Net-new columns below.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS packaging_form TEXT,
  ADD COLUMN IF NOT EXISTS pack_type TEXT CHECK (pack_type IS NULL OR pack_type IN ('Box', 'Bag')),
  ADD COLUMN IF NOT EXISTS units_per_pack INT CHECK (units_per_pack IS NULL OR units_per_pack > 0),
  ADD COLUMN IF NOT EXISTS unit_type TEXT CHECK (unit_type IS NULL OR unit_type IN ('Pieces', 'Packet')),
  ADD COLUMN IF NOT EXISTS price_per_pack NUMERIC(10,2) CHECK (price_per_pack IS NULL OR price_per_pack >= 0);
