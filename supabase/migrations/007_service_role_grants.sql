-- ── Fix: service_role itself was missing base table grants ──────────────────
-- Discovered while functional-testing the admin/delivery portals: even the
-- SERVICE ROLE key (createAdminClient(), used by virtually every admin API
-- route) got "permission denied for table X" on admin_profiles, profiles,
-- categories, etc. Supabase normally provisions these grants automatically,
-- but this project's tables were created via raw SQL migrations that never
-- ran the corresponding GRANT statements, so service_role never got them.
--
-- This is independent of the Clerk→Supabase Auth migration — it affects
-- every service-role write/read in the app (banners, products, coupons,
-- orders, admin_profiles, ...) and would have been broken under Clerk too.

GRANT USAGE ON SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Ensure future tables (from later migrations) automatically get these
-- grants too, instead of silently reintroducing this bug.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;
