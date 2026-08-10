-- ── One abandoned-cart row per customer ─────────────────────────────────────
-- The app tracks a single live cart per user (manual upsert by user_id). This
-- unique constraint prevents duplicate rows if two cart-sync requests ever race.
-- Optional — the app already works without it — but recommended for hygiene.

-- De-dup any existing rows first (keep the most recent per user).
DELETE FROM abandoned_carts a
  USING abandoned_carts b
  WHERE a.user_id = b.user_id
    AND a.id <> b.id
    AND a.last_activity < b.last_activity;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'abandoned_carts_user_id_key'
  ) THEN
    ALTER TABLE abandoned_carts
      ADD CONSTRAINT abandoned_carts_user_id_key UNIQUE (user_id);
  END IF;
END $$;
