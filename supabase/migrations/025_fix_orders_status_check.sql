-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: an order can be confirmed but never moved past it —
--        new row for relation "orders" violates check constraint
--        "orders_status_check"
--
-- 001_schema.sql pinned the status constraint to the original workflow:
--   placed, confirmed, assigned, processing, out_for_delivery, delivered,
--   cancelled, returned
--
-- The app has since moved to (src/types/database.types.ts OrderStatus):
--   placed, confirmed, packed, shipping, delivered, cancelled, returned
--
-- No migration ever widened the constraint, so 'packed' and 'shipping' — the two
-- steps immediately after 'confirmed' — are rejected by the database. That's why
-- confirming works and every later transition fails.
--
-- The legacy values are kept in the list. Any order still sitting on
-- 'assigned'/'processing'/'out_for_delivery' would otherwise fail revalidation
-- and this migration would abort.
--
-- Safe & idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    -- current workflow
    'placed', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled', 'returned',
    -- legacy, retained so pre-existing rows still validate
    'assigned', 'processing', 'out_for_delivery'
  ));

-- Prove every status the app can set is now accepted, so this can't silently
-- half-fix the workflow. The subtransaction is rolled back; no data changes.
DO $$
DECLARE
  v_status TEXT;
  v_order  UUID;
BEGIN
  SELECT id INTO v_order FROM orders LIMIT 1;
  IF v_order IS NULL THEN
    RAISE NOTICE 'No orders yet — constraint widened, nothing to probe.';
    RETURN;
  END IF;

  FOREACH v_status IN ARRAY ARRAY['placed','confirmed','packed','shipping','delivered','cancelled','returned']
  LOOP
    BEGIN
      UPDATE orders SET status = v_status WHERE id = v_order;
      RAISE EXCEPTION 'undo_probe';
    EXCEPTION
      WHEN check_violation THEN
        RAISE EXCEPTION 'status "%" is still rejected by orders_status_check', v_status;
      WHEN OTHERS THEN
        IF SQLERRM <> 'undo_probe' THEN RAISE; END IF;
    END;
  END LOOP;
  RAISE NOTICE 'All 7 order statuses accepted.';
END;
$$;

NOTIFY pgrst, 'reload schema';
