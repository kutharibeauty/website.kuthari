-- ─────────────────────────────────────────────────────────────────────────────
-- Two-level packaging: Box → (Hanger | Pack | Tin | Pouch) → Pieces.
--
-- The existing columns already carry the first level, so we reuse them:
--   pack_type      → the BIGGEST unit sold (e.g. 'Box')
--   unit_type      → the LOWER unit the customer can also buy ('Pack','Hanger','Tin')
--   units_per_pack → how many LOWER units are in one box   (e.g. 10 packs)
--
-- What was missing (added here, left NULL for the admin to fill in):
--   pieces_per_secondary → how many PIECES are in one lower unit (e.g. 10)
--   secondary_price/mrp  → optional per-lower-unit pricing; when NULL the app
--                          derives it as box price ÷ units_per_pack
--
-- Total pieces in a box = units_per_pack × pieces_per_secondary.
--   Everest 200gm: 10 packs/box × 10 pieces/pack   = 100 pieces
--   Small masala : 20 hangers/box × 60 pieces/hanger = 1,200 pieces
--
-- Additive & idempotent — existing products are unaffected until the admin
-- fills the new fields in.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pieces_per_secondary INTEGER,
  ADD COLUMN IF NOT EXISTS secondary_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS secondary_mrp        NUMERIC(10,2);

NOTIFY pgrst, 'reload schema';
