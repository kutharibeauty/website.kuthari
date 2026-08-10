-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: EVERY order insert fails with
--        ERROR 42702: column reference "fy" is ambiguous
--
-- generate_order_number() (migrations 012 and 018) declared a PL/pgSQL variable
-- called `fy`, while order_counters has a COLUMN called `fy`:
--
--     DECLARE fy TEXT := current_financial_year();
--     INSERT INTO order_counters (fy, last_value) VALUES (fy, 1)
--     ON CONFLICT (fy) ...          -- ← the variable, or the column? Postgres
--                                   --   won't guess, so it aborts.
--
-- That function runs in a BEFORE INSERT trigger on `orders`, so the ambiguity
-- fails the whole insert and the app reports "Failed to create order".
-- Migration 018 carried the same bug, which is why running it didn't help.
--
-- Fix: name the variables so they CANNOT collide with a column (v_fy / v_n) and
-- alias the table so the UPDATE/RETURNING clauses are explicit about what they
-- mean. Keeps 018's SECURITY DEFINER + pinned search_path.
--
-- Safe & idempotent. Existing orders keep their numbers; the counter is
-- untouched, so the BCR/<FY>/<n> series stays gap-free.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_counters (
  fy          TEXT PRIMARY KEY,
  last_value  INTEGER NOT NULL DEFAULT 0
);

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

  RETURN 'BCR/' || v_fy || '/' || v_n::TEXT;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON order_counters TO service_role, authenticated, anon;

-- Prove the function actually runs before any customer hits it. The inner block
-- is a subtransaction, so the deliberate abort rolls the counter bump back and
-- this probe consumes no order number.
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
