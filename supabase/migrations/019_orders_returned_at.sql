-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure orders.returned_at exists so returns can be timestamped.
--
-- It was introduced in 011_reconcile_live_schema.sql, which may never have been
-- run on the live database. Marking an order "Returned" works either way (the
-- app stamps this column best-effort), but running this enables the timestamp.
--
-- Additive & idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
