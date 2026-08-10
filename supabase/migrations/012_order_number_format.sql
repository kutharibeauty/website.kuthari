-- ─────────────────────────────────────────────────────────────────────────────
-- Order number format → BCR/<financial-year>/<n>
--   e.g.  BCR/2026-2027/1, BCR/2026-2027/2, …
-- The running number <n> RESETS to 1 at the start of each Indian financial year
-- (1 April – 31 March). A per-FY counter row gives an atomic, gap-free,
-- race-safe sequence — a legal requirement for a GST invoice series.
--
-- Idempotent & self-contained: safe to run even if the live DB's trigger/
-- function have drifted from earlier migrations. Existing orders keep whatever
-- number they already have; only NEW orders use this format.
-- ─────────────────────────────────────────────────────────────────────────────

-- Per-financial-year running counter.
CREATE TABLE IF NOT EXISTS order_counters (
  fy          TEXT PRIMARY KEY,          -- e.g. '2026-2027'
  last_value  INTEGER NOT NULL DEFAULT 0
);

-- Current Indian financial year as 'YYYY-YYYY' (Apr–Mar), in IST.
CREATE OR REPLACE FUNCTION current_financial_year()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Atomically bump the current FY's counter and return the formatted number.
-- INSERT … ON CONFLICT DO UPDATE takes a row lock, so concurrent orders can
-- never receive the same number.
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  fy   TEXT := current_financial_year();
  n    INT;
BEGIN
  INSERT INTO order_counters (fy, last_value)
       VALUES (fy, 1)
  ON CONFLICT (fy)
  DO UPDATE SET last_value = order_counters.last_value + 1
    RETURNING last_value INTO n;

  RETURN 'BCR/' || fy || '/' || n::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Assign the number on insert only when one wasn't supplied.
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_order_number ON orders;
CREATE TRIGGER trg_orders_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_number();
