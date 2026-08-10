-- 027: track when a product's CURRENT price took effect.
--
-- Needed for the Product JSON-LD `offers.validFrom` (Google Merchant listing).
-- Without a real timestamp the page would have to emit "now" on every request,
-- which resets on each render and misrepresents when the price actually started.

ALTER TABLE products ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;

-- Backfill from the row's own last-modified time — the most recent REAL
-- timestamp we hold for existing rows. It is never EARLIER than the moment the
-- current price took effect, so it cannot overstate how long that price has
-- been valid (an invented earlier date would).
UPDATE products
   SET price_updated_at = COALESCE(updated_at, created_at)
 WHERE price_updated_at IS NULL;

-- Keep it honest from here on: stamp ONLY when `price` actually changes, so a
-- routine edit (description, images, stock) never moves the price date. Done in
-- the DB rather than the API so it holds for every write path — PUT, PATCH,
-- imports and manual SQL alike.
CREATE OR REPLACE FUNCTION set_price_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.price_updated_at := COALESCE(NEW.price_updated_at, NOW());
  ELSIF NEW.price IS DISTINCT FROM OLD.price THEN
    NEW.price_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_price_updated_at ON products;
CREATE TRIGGER trg_price_updated_at
  BEFORE INSERT OR UPDATE OF price ON products
  FOR EACH ROW EXECUTE FUNCTION set_price_updated_at();
