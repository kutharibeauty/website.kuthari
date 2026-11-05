-- ════════════════════════════════════════════════════════════════════════════
-- RUN THIS ONCE in Supabase → SQL Editor → New query → paste → Run.
-- Applies migrations 039–043 together, in one transaction: if anything fails,
-- nothing is changed.
--
-- Data safety:
--   • Snapshots of the two tables whose data this touches are taken first:
--     backup_20261104_orders and backup_20261104_cms_content (RLS on, so they
--     are private). Drop them after a week once everything looks right.
--   • 039 changes access rules only (no rows). 040/041 add new tables.
--   • 042 adds two columns with defaults and widens two checks; existing
--     values stay valid. 043 copies placeholder CMS rows to an archive table
--     before removing them, and adds indexes.
--   • Every statement is written to be safe to run again.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.backup_20261104_orders AS TABLE public.orders;
CREATE TABLE IF NOT EXISTS public.backup_20261104_cms_content AS TABLE public.cms_content;
ALTER TABLE public.backup_20261104_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_20261104_cms_content ENABLE ROW LEVEL SECURITY;


-- ─── 039_lock_down_customer_data ───
-- ════════════════════════════════════════════════════════════════════════════
-- 039 · Lock down customer data
-- ════════════════════════════════════════════════════════════════════════════
-- 002_rls.sql created policies with USING (true) on profiles, addresses,
-- orders, order_items and order_timeline. Because the anon key ships in every
-- browser bundle, anyone could read every customer's name, phone, email and
-- home address through the public REST API, edit profiles, write or delete
-- addresses, and insert orders.
--
-- The app never needs those policies: every read and write of customer data
-- goes through API routes and server components using the service-role key,
-- which bypasses RLS. (The two routes that used the user-scoped client for
-- orders were moved to the server client in the same change.)
--
-- This migration:
--   1. drops the permissive customer-data policies, and
--   2. turns RLS on for every table in `public` that does not have it yet
--      (wishlists, shopping_lists, referrals, … were created without it), so a
--      table with no policy is closed to anon and authenticated by default.
--
-- Catalog read policies (products, categories, banners, cms_content, coupons,
-- serviceable_pincodes, product_faqs, reviews) are untouched: the storefront
-- reads those with the anon key.
--
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "user_read_profiles"      ON public.profiles;
DROP POLICY IF EXISTS "user_update_profiles"    ON public.profiles;
DROP POLICY IF EXISTS "user_all_addresses"      ON public.addresses;
DROP POLICY IF EXISTS "user_read_orders"        ON public.orders;
DROP POLICY IF EXISTS "user_insert_orders"      ON public.orders;
DROP POLICY IF EXISTS "user_read_order_items"   ON public.order_items;
DROP POLICY IF EXISTS "user_read_order_timeline" ON public.order_timeline;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
    RAISE NOTICE 'RLS enabled on public.%', t.relname;
  END LOOP;
END $$;

-- Verify (run separately): every row should say true, and no policy on the
-- customer tables should remain.
--   SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1;
--   SELECT tablename, policyname FROM pg_policies
--    WHERE schemaname = 'public' AND tablename IN ('profiles','addresses','orders','order_items','order_timeline');

-- ─── 040_rate_limits ───
-- ════════════════════════════════════════════════════════════════════════════
-- 040 · Shared rate-limit counters
-- ════════════════════════════════════════════════════════════════════════════
-- src/lib/rate-limit.ts kept its counters in process memory when Upstash isn't
-- configured. On Vercel every request can land on a different instance, so
-- that memory isn't shared and the OTP limits (5 sends per phone per hour,
-- 30 per IP) never actually held, leaving SMS credits open to abuse.
--
-- This gives the app one atomic, shared counter in Postgres. Upstash still
-- wins when its env vars are set; this is the default otherwise.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key       text PRIMARY KEY,
  count     integer     NOT NULL,
  reset_at  timestamptz NOT NULL
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;  -- service role only

-- Increment `p_key` inside a fixed window of `p_window_seconds`. Returns the
-- count after this hit and the seconds left in the window. One statement, so
-- concurrent hits on the same key can't both read the old value.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key text, p_window_seconds integer)
RETURNS TABLE (hits integer, ttl_seconds integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.rate_limits AS r (key, count, reset_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE
    SET count    = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.count + 1 END,
        reset_at = CASE WHEN r.reset_at <= now() THEN now() + make_interval(secs => p_window_seconds) ELSE r.reset_at END
  RETURNING r.count, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (r.reset_at - now()))))::integer;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer) TO service_role;

-- Old windows are dead weight; clear them now and then (the daily cron does it).
CREATE OR REPLACE FUNCTION public.rate_limits_prune()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limits WHERE reset_at < now() - interval '1 day';
$$;
REVOKE ALL ON FUNCTION public.rate_limits_prune() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limits_prune() TO service_role;

-- ─── 041_payment_events ───
-- ════════════════════════════════════════════════════════════════════════════
-- 041 · Razorpay payment events
-- ════════════════════════════════════════════════════════════════════════════
-- Checkout creates the order only after the browser comes back from Razorpay
-- with a signed payment. If the shopper pays and then closes the tab or loses
-- signal, the money is captured but no order exists.
--
-- /api/webhooks/razorpay records every captured / failed payment here, straight
-- from Razorpay, and /api/cron/reconcile-payments emails the shop any captured
-- payment that never became an order, so it can be fulfilled or refunded.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.payment_events (
  razorpay_payment_id text PRIMARY KEY,
  razorpay_order_id   text,
  event               text        NOT NULL,
  status              text,
  amount_paise        integer,
  email               text,
  contact             text,
  raw                 jsonb       NOT NULL,
  alerted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_created ON public.payment_events (created_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;  -- service role only

-- ─── 042_payment_options ───
-- ════════════════════════════════════════════════════════════════════════════
-- 042 · Payment options: cash on delivery and part payment for bulk orders
-- ════════════════════════════════════════════════════════════════════════════
-- Adds the 'partial' payment method (an advance paid online, the balance in
-- cash on delivery) and records how much of each order was paid online and how
-- much the delivery person still has to collect.
--
-- Data-safe: only ADDS columns (with defaults) and WIDENS two CHECK lists.
-- Existing rows keep their values; every existing value ('cod', 'online',
-- 'pending', 'collected', 'failed', 'refunded') stays valid. Existing orders
-- are back-filled from what they already say: online + collected = fully paid,
-- anything else = the whole total still due.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_paid numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_due  numeric(12,2) NOT NULL DEFAULT 0;

-- Widen the payment_method / payment_status checks, whatever they are named on
-- the live table (the schema has drifted from the original migrations).
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public' AND rel.relname = 'orders' AND con.contype = 'c'
      AND (pg_get_constraintdef(con.oid) ILIKE '%payment_method%' OR pg_get_constraintdef(con.oid) ILIKE '%payment_status%')
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod', 'online', 'partial'));

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'partial', 'collected', 'failed', 'refunded'));

-- Back-fill existing orders (only rows still at the 0/0 defaults).
UPDATE public.orders
SET amount_paid = CASE WHEN payment_method = 'online' AND payment_status = 'collected' THEN total ELSE 0 END,
    amount_due  = CASE WHEN payment_method = 'online' AND payment_status = 'collected' THEN 0 ELSE total END
WHERE amount_paid = 0 AND amount_due = 0 AND total IS NOT NULL;

-- ─── 043_archive_placeholder_cms_and_indexes ───
-- ════════════════════════════════════════════════════════════════════════════
-- 043 · Retire placeholder CMS rows, add indexes for common queries
-- ════════════════════════════════════════════════════════════════════════════
-- 1. cms_content still holds rows from the BCR Traders template ("Fresh
--    Commodities at Wholesale Prices", "+91 XXXXXXXXXX", info@bcrtraders.com…).
--    Nothing reads these keys any more. They are COPIED to cms_content_archive
--    first and only then removed, so nothing is lost and any row can be put
--    back with one INSERT … SELECT.
--
-- 2. Indexes for the queries the dashboard, analytics, order pages, delivery
--    panel and payment reconciliation run. CREATE INDEX IF NOT EXISTS changes
--    no data. Each index is created only if its columns exist on the live table
--    (the schema has drifted from the migrations).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cms_content_archive (
  key          text        NOT NULL,
  value        jsonb,
  archived_at  timestamptz NOT NULL DEFAULT now(),
  reason       text
);
ALTER TABLE public.cms_content_archive ENABLE ROW LEVEL SECURITY;  -- service role only

WITH retired AS (
  SELECT key, value::jsonb AS value
  FROM public.cms_content
  WHERE key IN ('hero_title', 'hero_subtitle', 'delivery_promise', 'contact_phone',
                'contact_email', 'contact_address', 'footer_tagline',
                'min_order_value', 'bulk_order_minimum')
     -- The old trust_badges row is an object {"items": [...]} of BCR claims;
     -- the admin now saves an array, which is left alone.
     OR (key = 'trust_badges' AND jsonb_typeof(value::jsonb) = 'object')
)
INSERT INTO public.cms_content_archive (key, value, reason)
SELECT key, value, 'BCR Traders template placeholder, unused by the storefront'
FROM retired
WHERE NOT EXISTS (SELECT 1 FROM public.cms_content_archive a WHERE a.key = retired.key);

DELETE FROM public.cms_content c
WHERE EXISTS (SELECT 1 FROM public.cms_content_archive a WHERE a.key = c.key)
  AND (c.key <> 'trust_badges' OR jsonb_typeof(c.value::jsonb) = 'object');

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pg_temp.ix(p_name text, p_table text, p_cols text[], p_expr text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = p_table AND column_name = ANY (p_cols)) = array_length(p_cols, 1)
  THEN
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I %s', p_name, p_table, p_expr);
  ELSE
    RAISE NOTICE 'skipped index % (columns missing on %)', p_name, p_table;
  END IF;
END $$;

SELECT pg_temp.ix('idx_orders_user_created',   'orders', ARRAY['user_id','created_at'],   '(user_id, created_at DESC)');
SELECT pg_temp.ix('idx_orders_created',        'orders', ARRAY['created_at'],             '(created_at DESC)');
SELECT pg_temp.ix('idx_orders_status_created', 'orders', ARRAY['status','created_at'],    '(status, created_at DESC)');
SELECT pg_temp.ix('idx_orders_payment_ref',    'orders', ARRAY['payment_reference'],      '(payment_reference) WHERE payment_reference IS NOT NULL');
SELECT pg_temp.ix('idx_orders_assigned_to',    'orders', ARRAY['assigned_to','created_at'], '(assigned_to, created_at DESC)');
SELECT pg_temp.ix('idx_products_active_order', 'products', ARRAY['is_active','display_order'], '(is_active, display_order)');
SELECT pg_temp.ix('idx_reviews_product_ok',    'reviews', ARRAY['product_id','is_approved','created_at'], '(product_id, is_approved, created_at DESC)');
SELECT pg_temp.ix('idx_abandoned_updated',     'abandoned_carts', ARRAY['updated_at'],    '(updated_at DESC)');
SELECT pg_temp.ix('idx_unserviceable_created', 'unserviceable_attempts', ARRAY['created_at'], '(created_at DESC)');
SELECT pg_temp.ix('idx_addresses_user',        'addresses', ARRAY['user_id'],             '(user_id)');

COMMIT;

-- Check afterwards (each should match what the comment says):
--   SELECT count(*) FROM public.orders;  -- same as backup_20261104_orders
--   SELECT count(*) FROM public.backup_20261104_orders;
--   SELECT tablename, policyname FROM pg_policies WHERE schemaname='public'
--     AND tablename IN ('profiles','addresses','orders','order_items','order_timeline');  -- no rows
--   SELECT key FROM public.cms_content_archive;  -- the retired placeholder keys
