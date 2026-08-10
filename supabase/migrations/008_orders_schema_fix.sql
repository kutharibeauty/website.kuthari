-- ── Fix: `orders` table was missing columns the app has always assumed ──────
-- Discovered via live functional testing: /api/orders (checkout) inserts
-- `items`, `address`, `delivery_fee`, `is_bulk` — none of which existed on
-- the live table (which instead had an unused `delivery_address NOT NULL`
-- column that nothing in the codebase ever references). Every order
-- creation attempt, and every admin/customer/delivery order read, has been
-- failing with "column does not exist" — this is not something the Clerk
-- migration introduced; it predates it.

-- `delivery_address` was NOT NULL and unused everywhere — rename rather than
-- add a parallel `address` column, so the NOT NULL constraint stays honest
-- (the app always supplies this field, just under a different column name).
ALTER TABLE orders RENAME COLUMN delivery_address TO address;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_bulk BOOLEAN NOT NULL DEFAULT false;
