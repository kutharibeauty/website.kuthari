-- ════════════════════════════════════════════════════════════════════════════
-- 047 · Razorpay payment id of a cash-balance payment link
-- ════════════════════════════════════════════════════════════════════════════
-- payment_reference holds the checkout payment. A balance paid later through a
-- payment link is a second Razorpay payment; recording it here lets the
-- reconcile cron match it to its order instead of reporting it as orphaned.
-- Additive only.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS balance_payment_reference text;

CREATE INDEX IF NOT EXISTS orders_balance_payment_reference_idx
  ON public.orders (balance_payment_reference) WHERE balance_payment_reference IS NOT NULL;
