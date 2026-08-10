-- ── Product weight/size variants ────────────────────────────────────────────
-- Lets a product offer selectable options (e.g. 5kg / 10kg) each with its own
-- price and MRP. Stored as a JSONB array of { label, price, mrp }. Empty array
-- means a single-price product (no variant selector shown).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;
