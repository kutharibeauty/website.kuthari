-- 035: order-number / invoice-number prefix  BCRT/  ->  KBS/
--   e.g.  BCRT/2026-2027/5   becomes   KBS/2026-2027/5
--
-- Pure rebrand for Kuthari Beauty Store. Identical to migration 032 in every
-- other respect (same financial-year source, same locked counter so numbers
-- can't collide).
--
-- Safe here because this is a fresh database with no historical orders. On a
-- database that already had orders, existing rows would keep their stored
-- order_number — those are historical invoice numbers and must not be rewritten.

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fy TEXT := current_financial_year();
  v_n  INT;
BEGIN
  -- ON CONFLICT DO UPDATE takes a row lock, so two orders placed at the same
  -- instant can never be handed the same number.
  INSERT INTO order_counters AS oc (fy, last_value)
       VALUES (v_fy, 1)
  ON CONFLICT (fy)
  DO UPDATE SET last_value = oc.last_value + 1
    RETURNING oc.last_value INTO v_n;

  RETURN 'KBS/' || v_fy || '/' || v_n::TEXT;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON order_counters TO service_role, authenticated, anon;

-- Prove the function runs before any customer hits it. The inner block is a
-- subtransaction, so the deliberate abort rolls the counter bump back and this
-- probe consumes no order number.
DO $$
DECLARE
  v_probe TEXT;
BEGIN
  BEGIN
    v_probe := generate_order_number();
    RAISE NOTICE 'generate_order_number() OK -> %', v_probe;
    RAISE EXCEPTION 'undo_probe';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'undo_probe' THEN
        RAISE EXCEPTION 'generate_order_number() is still broken: %', SQLERRM;
      END IF;
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';
