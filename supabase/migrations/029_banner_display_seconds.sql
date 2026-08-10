-- 029: how long each banner stays on screen before the carousel advances.
--
-- The hero carousel used a hardcoded 5s for every slide, so an admin had no way
-- to give a busier banner longer to be read. This is per-banner rather than one
-- global speed: a global setting is just the case where every row holds the
-- same value, so per-banner covers both.
--
-- Defaults to 5 so existing rows keep exactly the current behaviour.
-- Bounded 1..60: a 0 would spin the carousel continuously and something like
-- 3600 would look broken/stuck to a customer.

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS display_seconds INT NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'banners_display_seconds_range'
  ) THEN
    ALTER TABLE banners
      ADD CONSTRAINT banners_display_seconds_range
      CHECK (display_seconds BETWEEN 1 AND 60);
  END IF;
END $$;
