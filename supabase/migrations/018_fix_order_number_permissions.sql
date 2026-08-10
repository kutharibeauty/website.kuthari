-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: order creation failing after migration 012.
--
-- 012 changed generate_order_number() to bump a counter row in the NEW
-- `order_counters` table. That function runs inside a BEFORE INSERT trigger on
-- `orders`, executing as the CALLING role. If that role has no INSERT/UPDATE
-- grant on order_counters, the trigger errors and EVERY order insert fails
-- ("permission denied for table order_counters") — surfacing in the app as
-- "Failed to create order".
--
-- Fix both ways:
--   1. SECURITY DEFINER so the function always runs with the owner's rights,
--      regardless of which role inserts the order.
--   2. Explicit grants on order_counters as a belt-and-braces fallback.
--
-- Safe & idempotent — re-running is harmless.
-- ─────────────────────────────────────────────────────────────────────────────

-- Make sure the counter table exists (no-op if 012 already created it).
CREATE TABLE IF NOT EXISTS order_counters (
  fy          TEXT PRIMARY KEY,
  last_value  INTEGER NOT NULL DEFAULT 0
);

-- 1. Run the generator with the definer's privileges. A pinned search_path keeps
--    it safe (prevents search_path hijacking on a SECURITY DEFINER function).
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  fy TEXT := current_financial_year();
  n  INT;
BEGIN
  INSERT INTO order_counters (fy, last_value)
       VALUES (fy, 1)
  ON CONFLICT (fy)
  DO UPDATE SET last_value = order_counters.last_value + 1
    RETURNING last_value INTO n;

  RETURN 'BCR/' || fy || '/' || n::TEXT;
END;
$$;

-- current_financial_year() is called from the definer function — pin it too.
CREATE OR REPLACE FUNCTION current_financial_year()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  d DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  y INT  := EXTRACT(YEAR  FROM d)::INT;
  m INT  := EXTRACT(MONTH FROM d)::INT;
BEGIN
  IF m >= 4 THEN
    RETURN y::TEXT || '-' || (y + 1)::TEXT;
  ELSE
    RETURN (y - 1)::TEXT || '-' || y::TEXT;
  END IF;
END;
$$;

-- 2. Fallback grants so the trigger works even without SECURITY DEFINER.
GRANT SELECT, INSERT, UPDATE ON order_counters TO service_role, authenticated, anon;

-- Ask PostgREST to reload its schema cache (picks up any newly added columns,
-- e.g. orders.gstin from migration 013).
NOTIFY pgrst, 'reload schema';
