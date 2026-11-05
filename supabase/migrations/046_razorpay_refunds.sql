-- ════════════════════════════════════════════════════════════════════════════
-- 046 · Razorpay refunds and payment links on orders
-- ════════════════════════════════════════════════════════════════════════════
-- When a paid order is cancelled the app refunds the online part through
-- Razorpay and tracks it here; the webhook moves refund_status to processed or
-- failed. payment_link_id ties a cash-balance payment link to its order so the
-- webhook can mark the balance paid. Additive only; no existing row changes.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_id       text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_status   text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_amount   numeric(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_at     timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_link_id text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_refund_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_refund_status_check
      CHECK (refund_status IS NULL OR refund_status IN ('pending', 'processed', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_refund_id_idx       ON public.orders (refund_id)       WHERE refund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_payment_link_id_idx ON public.orders (payment_link_id) WHERE payment_link_id IS NOT NULL;
