-- 033: referrer reward becomes count-based (N referrals = N uses).
--
-- Previously the referrer earned a rupee `referral_credit` balance that
-- auto-applied at their own checkout. The program now works as: each person who
-- places an order with your code gives you ONE use of the referrer discount,
-- applied once per your own order and capped at how many people referred you.
--
-- The count of people who used a code is COUNT(referrals WHERE referrer_id = me).
-- This column tracks how many of those uses the referrer has already spent, so
-- available uses = referrals_count - referral_redemptions_used.
--
-- `referral_credit` is left in place (not dropped) so any historical balance is
-- preserved for reference; it is no longer applied to new orders.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_redemptions_used INT NOT NULL DEFAULT 0;

-- The referrer's available-uses count reads referrals by referrer_id, so index it.
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id);
