-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: every coupon is counted TWICE per order, so a coupon with max_uses = 100
-- stops working after 50 orders.
--
-- Two things increment coupons.uses_count for the same order:
--   1. trg_orders_coupon_uses  — the AFTER INSERT trigger from 001_schema.sql
--   2. increment_coupon_use()  — the RPC from 014, called by the order route
--
-- Keep the RPC and drop the trigger. The RPC is the correct one: it is guarded
-- (`AND (max_uses IS NULL OR uses_count < max_uses)`) so it can never push a
-- coupon past its limit, and it reports whether it applied. The trigger is
-- unguarded and silent.
--
-- Safe & idempotent. Historical uses_count values are left alone — they are
-- inflated (roughly 2x) for coupons used before this migration; correcting them
-- would need a judgement call on real business data, so the admin should reset
-- any affected coupon's count by hand in the panel.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_orders_coupon_uses ON orders;

-- The function is now unused, but dropping it would break any other trigger a
-- future migration might attach. Leave it defined and simply not wired up.

NOTIFY pgrst, 'reload schema';
