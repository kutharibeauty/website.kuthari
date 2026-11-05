-- ════════════════════════════════════════════════════════════════════════════
-- 042 · Payment options: cash on delivery and part payment for bulk orders
-- ════════════════════════════════════════════════════════════════════════════
-- Adds the 'partial' payment method (an advance paid online, the balance in
-- cash on delivery) and records how much of each order was paid online and how
-- much the delivery person still has to collect.
--
-- Data-safe: only ADDS columns (with defaults) and WIDENS two CHECK lists.
-- Existing rows keep their values; every existing value ('cod', 'online',
-- 'pending', 'collected', 'failed', 'refunded') stays valid. Existing orders
-- are back-filled from what they already say: online + collected = fully paid,
-- anything else = the whole total still due.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_paid numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_due  numeric(12,2) NOT NULL DEFAULT 0;

-- Widen the payment_method / payment_status checks, whatever they are named on
-- the live table (the schema has drifted from the original migrations).
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public' AND rel.relname = 'orders' AND con.contype = 'c'
      AND (pg_get_constraintdef(con.oid) ILIKE '%payment_method%' OR pg_get_constraintdef(con.oid) ILIKE '%payment_status%')
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod', 'online', 'partial'));

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'partial', 'collected', 'failed', 'refunded'));

-- Back-fill existing orders (only rows still at the 0/0 defaults).
UPDATE public.orders
SET amount_paid = CASE WHEN payment_method = 'online' AND payment_status = 'collected' THEN total ELSE 0 END,
    amount_due  = CASE WHEN payment_method = 'online' AND payment_status = 'collected' THEN 0 ELSE total END
WHERE amount_paid = 0 AND amount_due = 0 AND total IS NOT NULL;
