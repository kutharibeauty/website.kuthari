-- ── 17.1  WhatsApp opt-in field on profiles ────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;

-- ── 17.5  Return / Refund ────────────────────────────────────────────────────
-- Note: 'returned' is already included in the orders.status CHECK constraint
-- in 001_schema.sql — no enum type exists, nothing to alter.

-- Track when an order was returned
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

-- ── 17.10  Error log table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_log (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  route      text,
  message    text        NOT NULL,
  code       text,
  stack      text,
  user_id    text,
  created_at timestamptz DEFAULT now()
);

-- Trim old entries automatically (keep last 10 000 rows)
CREATE INDEX IF NOT EXISTS error_log_created_at_idx ON error_log (created_at DESC);
