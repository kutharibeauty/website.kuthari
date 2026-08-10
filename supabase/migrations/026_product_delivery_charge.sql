-- ─────────────────────────────────────────────────────────────────────────────
-- Per-product delivery charge, toggled on/off by the admin.
--
--   delivery_charge          the amount (₹) to charge for delivering this product
--   delivery_charge_enabled  whether that charge currently applies
--
-- Both are optional and default to "no charge", so existing products and orders
-- are unaffected until an admin turns a charge on. Additive & idempotent.
--
-- Run this BEFORE saving a product with a delivery charge — the admin form now
-- writes these columns, and naming a column that doesn't exist would fail the
-- whole product save.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS delivery_charge         NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_charge_enabled BOOLEAN       NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
