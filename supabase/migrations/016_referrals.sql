-- ─────────────────────────────────────────────────────────────────────────────
-- Referral program.
--   • Every customer gets a unique, hard-to-guess referral code on their first
--     purchase (stored on their profile).
--   • A NEW customer (0 prior orders) can redeem someone's code at checkout for a
--     "taker" discount on their first order.
--   • The referrer then earns a "giver" reward, accrued as referral_credit that
--     auto-applies on their next order.
-- Discount type/value for giver & taker are configured by the admin (stored in
-- cms_content under key 'referral_config' — no table needed for config).
--
-- Additive & idempotent; safe on the drifted live schema.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code   TEXT,
  ADD COLUMN IF NOT EXISTS referral_credit NUMERIC(10,2) NOT NULL DEFAULT 0;

-- One code per customer (case-sensitive; codes are stored uppercase).
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON profiles (referral_code)
  WHERE referral_code IS NOT NULL;

-- Redemption ledger: one row per successful referral. referee_id is UNIQUE so a
-- customer can be referred at most once.
CREATE TABLE IF NOT EXISTS referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID NOT NULL,
  referee_id    UUID NOT NULL UNIQUE,
  code          TEXT NOT NULL,
  order_id      UUID,
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id);
