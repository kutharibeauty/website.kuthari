-- 036: Retail-first rebuild.
--
-- The client moved from wholesale-only to selling retail as well, and now ships
-- all over India instead of only Ganjam district. Three changes:
--
--   1. Products carry a RETAIL price/MRP alongside the existing wholesale pair.
--      `price`/`mrp` keep their meaning (wholesale); the new columns are the
--      retail equivalents. Both are offered to the customer as selectable buy
--      options — whichever they pick becomes its own cart line.
--
--   2. Pincodes carry their own delivery charge. The pincode table stops being
--      a serviceability allow-list and becomes a delivery-rate lookup: any
--      pincode not listed simply falls back to the default rate in code.
--
--   3. The unserviceable-attempt tracking is dropped — with all-India delivery
--      there is no such thing as an unserviceable pincode.

-- ── 1. Retail pricing ────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS retail_mrp   NUMERIC(10,2);

COMMENT ON COLUMN products.retail_price IS
  'Per-unit retail selling price. NULL = this product is wholesale-only.';
COMMENT ON COLUMN products.retail_mrp IS
  'Retail strikethrough MRP. Optional even when retail_price is set.';

-- ── 2. Per-pincode delivery charge ───────────────────────────────────────────
-- NULL means "not set" and falls back to the default rate in code, which is
-- deliberately different from an explicit 0 (genuinely free delivery there).
ALTER TABLE serviceable_pincodes
  ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2);

COMMENT ON COLUMN serviceable_pincodes.delivery_charge IS
  'Delivery charge for this pincode. NULL = use the default rate in code; 0 = free delivery to this pincode.';

-- The table no longer gates ordering, so `is_active` would silently make a
-- pincode "unreachable" again. Force every existing row active and default new
-- rows to active; the column is kept so the admin can still hide a stale row
-- from the list without losing its rate.
UPDATE serviceable_pincodes SET is_active = true WHERE is_active IS DISTINCT FROM true;

-- ── 3. Drop unserviceable tracking ───────────────────────────────────────────
-- Safe: this database is new and the table holds no rows.
DROP TABLE IF EXISTS unserviceable_attempts CASCADE;

NOTIFY pgrst, 'reload schema';
