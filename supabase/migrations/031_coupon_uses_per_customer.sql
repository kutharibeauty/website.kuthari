-- 031: cap how many times a SINGLE customer may use a coupon.
--
-- `max_uses` is a GLOBAL cap — uses_count counts redemptions across every
-- customer — so one person could keep reusing a coupon until the whole
-- allowance ran out. This adds a separate per-customer cap that works alongside
-- it: e.g. max_uses = 100 (overall) AND max_uses_per_customer = 1 (once each).
--
-- NULL means "no per-customer limit", so every existing coupon behaves exactly
-- as it does today until an admin sets a value.
--
-- No redemption table is needed: orders already store coupon_code and user_id,
-- so a customer's past redemptions are counted from their own orders.

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS max_uses_per_customer INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_max_uses_per_customer_positive'
  ) THEN
    ALTER TABLE coupons
      ADD CONSTRAINT coupons_max_uses_per_customer_positive
      CHECK (max_uses_per_customer IS NULL OR max_uses_per_customer > 0);
  END IF;
END $$;

-- Counting a customer's redemptions filters orders by user_id + coupon_code.
CREATE INDEX IF NOT EXISTS idx_orders_user_coupon
  ON orders (user_id, coupon_code)
  WHERE coupon_code IS NOT NULL;
