-- ─────────────────────────────────────────────────────────────────────────────
-- GST invoice ("claim GST bill") support on orders.
-- When a buyer is reselling and wants to claim input tax credit, they supply
-- their GSTIN + registered business name at checkout. Stored per-order so the
-- tax invoice can print the buyer's GST details.
--
-- A non-null `gstin` also marks the order as a GST/B2B order — used to enforce
-- "GST orders cannot be cancelled once placed".
--
-- Additive & idempotent; safe on the drifted live schema.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS gstin             TEXT,
  ADD COLUMN IF NOT EXISTS gst_business_name TEXT;
