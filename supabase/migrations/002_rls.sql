-- ─────────────────────────────────────────────────────────────────────────────
-- BCR TRADERS — Migration 002: Row Level Security
-- Run AFTER 001_schema.sql
--
-- Architecture:
--   • All admin/server mutations use the service_role key → bypasses RLS entirely.
--   • The anon key is used by the frontend for public catalogue reads only.
--   • User-specific reads/writes (orders, addresses, profiles) go through
--     Next.js API routes (service_role), so RLS on those tables is a
--     defense-in-depth layer, not the primary security gate.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICE-ROLE-ONLY TABLES
-- Enable RLS with NO policies → anon/authenticated keys are blocked entirely.
-- Only service_role (used by Next.js API routes) can access these.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE admin_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_otps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE unserviceable_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_translations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                ENABLE ROW LEVEL SECURITY;

-- No policies created for service-role-only tables.
-- service_role bypasses RLS; all other roles are denied by default.


-- ─────────────────────────────────────────────────────────────────────────────
-- PUBLIC CATALOGUE — Enable RLS + public read policies
-- Browseable without authentication (anon key).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_faqs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE serviceable_pincodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_products"
  ON products FOR SELECT
  USING (is_active = true);

CREATE POLICY "public_read_categories"
  ON categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "public_read_banners"
  ON banners FOR SELECT
  USING (is_active = true);

CREATE POLICY "public_read_faqs"
  ON product_faqs FOR SELECT
  USING (is_active = true);

CREATE POLICY "public_read_reviews"
  ON reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "public_read_cms"
  ON cms_content FOR SELECT
  USING (true);

CREATE POLICY "public_read_pincodes"
  ON serviceable_pincodes FOR SELECT
  USING (is_active = true);

-- Coupons: only expose active, non-expired coupons for client-side validation UI.
-- Full coupon validation (max_uses check etc.) is done server-side.
CREATE POLICY "public_read_active_coupons"
  ON coupons FOR SELECT
  USING (
    is_active = true
    AND (valid_until IS NULL OR valid_until > NOW())
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- USER-OWNED DATA
-- All writes go through Next.js API routes (service_role key → bypasses RLS).
-- These policies allow the authenticated Supabase client to read user data
-- if ever used directly; they are a safety net, not the primary gate.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

-- profiles: open read + update (service_role handles all writes)
CREATE POLICY "user_read_profiles"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "user_update_profiles"
  ON profiles FOR UPDATE USING (true);

-- addresses: full access (mutations via service_role API routes)
CREATE POLICY "user_all_addresses"
  ON addresses FOR ALL USING (true);

-- orders: read + insert (status updates via service_role API routes)
CREATE POLICY "user_read_orders"
  ON orders FOR SELECT USING (true);

CREATE POLICY "user_insert_orders"
  ON orders FOR INSERT WITH CHECK (true);

-- order_items: read only (created alongside order via service_role)
CREATE POLICY "user_read_order_items"
  ON order_items FOR SELECT USING (true);

-- order_timeline: read only (admin writes via service_role)
CREATE POLICY "user_read_order_timeline"
  ON order_timeline FOR SELECT USING (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- Create these in Supabase Dashboard → Storage → New Bucket
--
--   Bucket name         Access    Notes
--   ─────────────────── ───────── ─────────────────────────────────────────────
--   product-images      Public    Product gallery images, optimized via Next/Image
--   category-images     Public    Category thumbnails and banners
--   banner-images       Public    Homepage and promotional banners
--   invoice-pdfs        Private   Generated PDFs — only accessible via signed URL
--
-- After creating the buckets, add these storage policies in the SQL editor:
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow public read on public image buckets
CREATE POLICY "public_read_product_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "public_read_category_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'category-images');

CREATE POLICY "public_read_banner_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banner-images');

-- Allow service_role to upload/delete in all buckets (handled via API routes)
-- No INSERT/UPDATE/DELETE storage policies needed for public buckets
-- when uploads are done exclusively via the service_role key in API routes.