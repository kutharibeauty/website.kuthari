-- ════════════════════════════════════════════════════════════════════════════
-- 041 · Razorpay payment events
-- ════════════════════════════════════════════════════════════════════════════
-- Checkout creates the order only after the browser comes back from Razorpay
-- with a signed payment. If the shopper pays and then closes the tab or loses
-- signal, the money is captured but no order exists.
--
-- /api/webhooks/razorpay records every captured / failed payment here, straight
-- from Razorpay, and /api/cron/reconcile-payments emails the shop any captured
-- payment that never became an order, so it can be fulfilled or refunded.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.payment_events (
  razorpay_payment_id text PRIMARY KEY,
  razorpay_order_id   text,
  event               text        NOT NULL,
  status              text,
  amount_paise        integer,
  email               text,
  contact             text,
  raw                 jsonb       NOT NULL,
  alerted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_created ON public.payment_events (created_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;  -- service role only
