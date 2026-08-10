-- 030: per-coupon custom message for the homepage coupon ticker.
--
-- The marquee composes its line automatically: "CODE — 20% OFF · description".
-- That is fine as a default but gives an admin no way to say something specific
-- for one coupon ("Ends Sunday", "First order only", "ଆଜି ହିଁ କିଣନ୍ତୁ").
--
-- Kept separate from `description`, which is the coupon's own explanatory text
-- shown in the cards and at checkout — overloading that field would have made
-- one string serve two places with different needs.
--
-- Bilingual, matching the description/description_or pattern used elsewhere.
-- NULL means "compose the line as before", so existing coupons are unchanged.

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS marquee_message    TEXT,
  ADD COLUMN IF NOT EXISTS marquee_message_or TEXT;
