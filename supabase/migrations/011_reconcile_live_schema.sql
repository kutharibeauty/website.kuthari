-- ── Reconcile live schema with what the code expects ────────────────────────
-- A live-DB audit (PostgREST introspection) found the running database was
-- missing a few columns/tables the code relies on. These are additive and safe
-- — they preserve existing data. Run once in Supabase → SQL Editor.

-- Admin manages a per-pincode delivery ETA; the live serviceable_pincodes table
-- (which the public checkout validates against) had no such column.
ALTER TABLE serviceable_pincodes
  ADD COLUMN IF NOT EXISTS delivery_days int NOT NULL DEFAULT 2;

-- Order returns record when the return happened.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

-- WhatsApp opt-in consent flag (used by the future WhatsApp notification integration).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;

-- Server-side error logging target (lib/logger.ts). Missing table just made
-- logging a silent no-op; create it so errors are captured.
CREATE TABLE IF NOT EXISTS error_log (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  route      text,
  message    text        NOT NULL,
  code       text,
  stack      text,
  user_id    text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS error_log_created_at_idx ON error_log (created_at DESC);
