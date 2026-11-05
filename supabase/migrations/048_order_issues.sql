-- ════════════════════════════════════════════════════════════════════════════
-- 048 · Damaged / wrong item requests (replacement or exchange, no refunds)
-- ════════════════════════════════════════════════════════════════════════════
-- A customer reports a problem with a delivered order (reason, items, photos,
-- replacement or exchange). Staff approve or reject it, then mark it resolved
-- once the replacement is sent. One request per order. Service-role only, like
-- the other customer tables (migration 039): no browser access, no policies.
-- Additive only; no existing row changes.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.order_issues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id       uuid,
  reason        text NOT NULL CHECK (reason IN ('damaged', 'defective', 'wrong_item', 'missing_item', 'expired')),
  description   text,
  items         jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos        text[] NOT NULL DEFAULT '{}',
  resolution    text NOT NULL DEFAULT 'replacement' CHECK (resolution IN ('replacement', 'exchange')),
  status        text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'resolved')),
  admin_note    text,
  reviewed_by   text,
  reviewed_at   timestamptz,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS order_issues_order_id_key ON public.order_issues (order_id);
CREATE INDEX IF NOT EXISTS order_issues_status_idx ON public.order_issues (status, created_at DESC);

ALTER TABLE public.order_issues ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_issues FROM anon, authenticated;
GRANT ALL ON public.order_issues TO service_role;
