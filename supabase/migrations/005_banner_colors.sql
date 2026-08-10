-- ── Themed banners: colored hero carousel + mid-page promo cards ────────────
-- background_color/text_color let admin-authored banners render as colored
-- cards (no photography required), matching each banner's `placement`
-- ('hero' -> homepage carousel, 'mid_page' -> the 4-card promo row).

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#0C831F',
  ADD COLUMN IF NOT EXISTS text_color TEXT NOT NULL DEFAULT '#FFFFFF';

-- Text-only banners (color + copy, no photo) are now a first-class case.
ALTER TABLE banners ALTER COLUMN image_url DROP NOT NULL;

-- ── Fix: public catalogue tables were never GRANTed to anon/authenticated ───
-- 002_rls.sql defines RLS policies for these tables, but RLS policies only
-- take effect once the base Postgres GRANT exists. Without it every anon
-- read (categories, banners, products, ...) fails with "permission denied"
-- regardless of the RLS policy. Safe to grant broadly here since RLS still
-- gates row visibility (and service-role-only tables have no policies at all,
-- so they stay blocked even with this grant).
GRANT SELECT ON products, categories, banners, product_faqs, reviews, cms_content, serviceable_pincodes, coupons
  TO anon, authenticated;
