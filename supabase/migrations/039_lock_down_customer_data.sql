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
