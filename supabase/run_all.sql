-- =============================================================================
-- KUTHARI BEAUTY STORE — COMPLETE DATABASE SETUP
--
-- GENERATED FILE — every migration in supabase/migrations/, concatenated in
-- order. Do not hand-edit: add a new migration instead and regenerate.
--
-- HOW TO RUN (fresh Supabase project):
--   1. Create a new project at supabase.com
--   2. SQL Editor -> New Query
--   3. Paste this entire file
--   4. Run
--
-- AFTER RUNNING:
--   - Storage -> create these buckets:
--       product-images   (Public)
--       category-images  (Public)
--       banner-images    (Public)
--       invoice-pdfs     (Private)
--   - Copy the Project URL + anon key + service_role key into .env.local
--
-- Migrations included: 42 (001_schema.sql … 037_seed_categories.sql)
-- =============================================================================


-- =============================================================================
--  001_schema.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- BCR TRADERS — Migration 001: Core Schema
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES (customers, synced from Clerk webhooks)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id   TEXT UNIQUE NOT NULL,
  phone           TEXT UNIQUE NOT NULL,
  name            TEXT,
  email           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  preferred_lang  TEXT NOT NULL DEFAULT 'en' CHECK (preferred_lang IN ('en', 'or')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN PROFILES
-- Super admin creates these. Each profile = one Clerk account (phone login).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE admin_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id   TEXT UNIQUE,
  phone           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  role            TEXT NOT NULL DEFAULT 'admin'
                    CHECK (role IN ('super_admin', 'admin', 'delivery')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  permissions     JSONB NOT NULL DEFAULT '{
    "view_orders":              true,
    "update_order_status":      true,
    "manage_products":          false,
    "manage_categories":        false,
    "manage_banners":           false,
    "manage_coupons":           false,
    "manage_pincodes":          false,
    "manage_cms":               false,
    "manage_admin_profiles":    false,
    "manage_delivery_persons":  false,
    "view_analytics":           true,
    "view_abandoned_carts":     true,
    "view_unserviceable":       true,
    "receive_order_emails":     true,
    "export_data":              false
  }',
  created_by      UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ADDRESSES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'Home',
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  line1       TEXT NOT NULL,
  line2       TEXT,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  pincode     TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICEABLE PINCODES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE serviceable_pincodes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pincode     TEXT UNIQUE NOT NULL,
  area_name   TEXT,
  city        TEXT,
  state       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_by  UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- UNSERVICEABLE ATTEMPTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE unserviceable_attempts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone            TEXT NOT NULL,
  name             TEXT,
  pincode          TEXT NOT NULL,
  city             TEXT,
  state            TEXT,
  cart_snapshot    JSONB,
  admin_notified   BOOLEAN NOT NULL DEFAULT false,
  admin_contacted  BOOLEAN NOT NULL DEFAULT false,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  name_or          TEXT,
  slug             TEXT UNIQUE NOT NULL,
  description      TEXT,
  description_or   TEXT,
  image_url        TEXT,
  banner_url       TEXT,
  display_order    INT NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  meta_title       TEXT,
  meta_description TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id             UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name                    TEXT NOT NULL,
  name_or                 TEXT,
  slug                    TEXT UNIQUE NOT NULL,
  sku                     TEXT UNIQUE NOT NULL,
  description             TEXT,
  description_or          TEXT,
  short_desc              TEXT,
  short_desc_or           TEXT,
  price                   NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  mrp                     NUMERIC(10,2) CHECK (mrp >= 0),
  show_strikethrough      BOOLEAN NOT NULL DEFAULT false,
  unit                    TEXT NOT NULL,
  stock_qty               INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  low_stock_threshold     INT NOT NULL DEFAULT 10,
  min_order_qty           INT NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
  max_order_qty           INT,
  images                  TEXT[] NOT NULL DEFAULT '{}',
  tags                    TEXT[] NOT NULL DEFAULT '{}',
  meta_title              TEXT,
  meta_description        TEXT,
  auto_keywords           TEXT[] NOT NULL DEFAULT '{}',
  meta_keywords           TEXT[] NOT NULL DEFAULT '{}',
  gtin                    TEXT,
  mpn                     TEXT,
  brand                   TEXT NOT NULL DEFAULT 'BCR TRADERS',
  condition               TEXT NOT NULL DEFAULT 'new',
  google_product_category TEXT,
  availability            TEXT GENERATED ALWAYS AS (
                            CASE WHEN stock_qty > 0 THEN 'in stock' ELSE 'out of stock' END
                          ) STORED,
  rating_avg              NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count            INT NOT NULL DEFAULT 0,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  is_featured             BOOLEAN NOT NULL DEFAULT false,
  display_order           INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT FAQs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE product_faqs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  question_or   TEXT,
  answer        TEXT NOT NULL,
  answer_or     TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  order_id             UUID,
  admin_profile_id     UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  reviewer_name        TEXT NOT NULL,
  rating               INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                TEXT,
  body                 TEXT,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  is_admin_added       BOOLEAN NOT NULL DEFAULT false,
  is_approved          BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- BANNERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE banners (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT,
  subtitle         TEXT,
  image_url        TEXT NOT NULL,
  mobile_image_url TEXT,
  link_url         TEXT,
  cta_text         TEXT NOT NULL DEFAULT 'Shop Now',
  display_order    INT NOT NULL DEFAULT 0,
  placement        TEXT NOT NULL DEFAULT 'hero'
                     CHECK (placement IN ('hero', 'mid_page', 'category', 'product')),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CMS CONTENT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE cms_content (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  value_or    JSONB,
  description TEXT,
  updated_by  UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cms_content (key, value, value_or, description) VALUES
  ('site_announcement',  '{"text": "", "bg_color": "#0c831f", "is_active": false}', NULL, 'Top announcement bar'),
  ('hero_title',         '{"text": "Fresh Commodities at Wholesale Prices"}', '{"text": "ଥୋକ ମୂଲ୍ୟରେ ତାଜା ସାମଗ୍ରୀ"}', 'Homepage hero title'),
  ('hero_subtitle',      '{"text": "Odisha''s Most Trusted Oil, Pulses & Spice Distributor"}', '{"text": "ଓଡீଶାର ସର୍ବୋଚ୍ଚ ବିଶ୍ଵସ୍ତ ତେଲ, ଡାଲ ଓ ମସଲା ବିତରକ"}', 'Homepage hero subtitle'),
  ('delivery_promise',   '{"text": "Delivery within 24-48 hours"}', '{"text": "24-48 ଘଣ୍ଟା ମଧ୍ୟରେ ଡେଲିଭରି"}', 'Delivery promise text'),
  ('trust_badges',       '{"items": ["Best Wholesale Distributor in Odisha", "10,000+ Happy Customers", "Fresh Stock Every Week", "Direct from Manufacturers"]}', NULL, 'Trust badges on homepage'),
  ('contact_phone',      '{"text": "+91 XXXXXXXXXX"}', NULL, 'Footer contact phone'),
  ('contact_email',      '{"text": "info@bcrtraders.com"}', NULL, 'Footer contact email'),
  ('contact_address',    '{"text": "BCR TRADERS, Odisha, India"}', NULL, 'Footer address'),
  ('footer_tagline',     '{"text": "Your Trusted Commodities Partner"}', NULL, 'Footer tagline'),
  ('min_order_value',    '{"value": 0}', NULL, 'Minimum cart value for checkout'),
  ('bulk_order_minimum', '{"value": 5000}', NULL, 'Minimum value for bulk order discount');


-- ─────────────────────────────────────────────────────────────────────────────
-- COUPONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  description     TEXT,
  description_or  TEXT,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount    NUMERIC(10,2),
  max_uses        INT,
  uses_count      INT NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number          TEXT UNIQUE NOT NULL DEFAULT '',
  user_id               UUID NOT NULL REFERENCES profiles(id),
  status                TEXT NOT NULL DEFAULT 'placed'
                          CHECK (status IN (
                            'placed','confirmed','assigned','processing',
                            'out_for_delivery','delivered','cancelled','returned'
                          )),
  payment_method        TEXT NOT NULL DEFAULT 'cod'
                          CHECK (payment_method IN ('cod', 'online')),
  payment_status        TEXT NOT NULL DEFAULT 'pending'
                          CHECK (payment_status IN ('pending','collected','failed','refunded')),
  payment_collected_by  UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  payment_reference     TEXT,
  payment_method_used   TEXT,
  subtotal              NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount              NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  coupon_code           TEXT,
  total                 NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  delivery_address      JSONB NOT NULL,
  notes                 TEXT,
  accepted_by           UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  accepted_at           TIMESTAMPTZ,
  assigned_to           UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  assigned_at           TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  estimated_delivery    TEXT,
  custom_message        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name     TEXT NOT NULL,
  product_name_or  TEXT,
  product_unit     TEXT NOT NULL,
  product_sku      TEXT NOT NULL,
  image_url        TEXT,
  price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  mrp              NUMERIC(10,2),
  quantity         INT NOT NULL CHECK (quantity > 0),
  subtotal         NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  review_requested BOOLEAN NOT NULL DEFAULT false,
  review_submitted BOOLEAN NOT NULL DEFAULT false
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ORDER TIMELINE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE order_timeline (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status         TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  estimated_time TEXT,
  updated_by     UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  email_sent     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- DELIVERY OTPs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE delivery_otps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_man_id UUID NOT NULL REFERENCES admin_profiles(id),
  customer_phone  TEXT NOT NULL,
  otp             TEXT NOT NULL,
  is_used         BOOLEAN NOT NULL DEFAULT false,
  attempts        INT NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NOT NULL,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ABANDONED CARTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE abandoned_carts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone         TEXT,
  cart_items    JSONB NOT NULL,
  total_value   NUMERIC(10,2),
  item_count    INT,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_recovered  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT TRANSLATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE product_translations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lang        TEXT NOT NULL CHECK (lang IN ('or')),
  name        TEXT,
  short_desc  TEXT,
  description TEXT,
  unit_label  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, lang)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATION LOG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE notification_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  recipient   TEXT NOT NULL,
  subject     TEXT,
  template    TEXT,
  status      TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_clerk          ON profiles(clerk_user_id);
CREATE INDEX idx_addresses_user          ON addresses(user_id);
CREATE INDEX idx_products_category       ON products(category_id);
CREATE INDEX idx_products_slug           ON products(slug);
CREATE INDEX idx_products_sku            ON products(sku);
CREATE INDEX idx_products_active         ON products(is_active);
CREATE INDEX idx_products_featured       ON products(is_featured);
CREATE INDEX idx_products_name_trgm      ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_orders_user             ON orders(user_id);
CREATE INDEX idx_orders_status           ON orders(status);
CREATE INDEX idx_orders_created          ON orders(created_at DESC);
CREATE INDEX idx_orders_assigned         ON orders(assigned_to);
CREATE INDEX idx_order_items_order       ON order_items(order_id);
CREATE INDEX idx_reviews_product         ON reviews(product_id);
CREATE INDEX idx_reviews_approved        ON reviews(product_id, is_approved);
CREATE INDEX idx_abandoned_carts_user    ON abandoned_carts(user_id);
CREATE INDEX idx_abandoned_active        ON abandoned_carts(last_activity DESC) WHERE is_recovered = false;
CREATE INDEX idx_unserviceable_pincode   ON unserviceable_attempts(pincode);
CREATE INDEX idx_serviceable_pincode     ON serviceable_pincodes(pincode) WHERE is_active = true;
CREATE INDEX idx_delivery_otps_order     ON delivery_otps(order_id);
CREATE INDEX idx_delivery_otps_active    ON delivery_otps(order_id) WHERE is_used = false;
CREATE INDEX idx_faqs_product            ON product_faqs(product_id, display_order);
CREATE INDEX idx_admin_phone             ON admin_profiles(phone);
CREATE INDEX idx_admin_role              ON admin_profiles(role);
CREATE INDEX idx_coupons_code            ON coupons(code) WHERE is_active = true;
CREATE INDEX idx_timeline_order          ON order_timeline(order_id, created_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-set updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated    BEFORE UPDATE ON profiles             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_admin_updated       BEFORE UPDATE ON admin_profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_categories_updated  BEFORE UPDATE ON categories           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated    BEFORE UPDATE ON products             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated      BEFORE UPDATE ON orders               FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_banners_updated     BEFORE UPDATE ON banners              FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_serviceable_updated BEFORE UPDATE ON serviceable_pincodes FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-generate order number (BCR-YYYYMMDD-XXXX)
-- Global sequence is atomic — no race conditions under concurrent inserts.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'BCR-'
    || TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD')
    || '-'
    || LPAD(nextval('order_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_number();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: keep product rating_avg + rating_count in sync
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  pid UUID := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE products SET
    rating_avg   = COALESCE((
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM reviews
      WHERE product_id = pid AND is_approved = true
    ), 0),
    rating_count = (
      SELECT COUNT(*) FROM reviews
      WHERE product_id = pid AND is_approved = true
    )
  WHERE id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: enforce single default address per user
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE addresses
  SET is_default = false
  WHERE user_id = NEW.user_id AND id <> NEW.id AND is_default = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_address_default
  AFTER INSERT OR UPDATE OF is_default ON addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_address();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: increment coupon uses_count on order insert
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_coupon_uses()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.coupon_code IS NOT NULL THEN
    UPDATE coupons SET uses_count = uses_count + 1
    WHERE code = NEW.coupon_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_coupon_uses
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION increment_coupon_uses();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-insert first timeline entry when order is placed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_order_timeline()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_timeline (order_id, status, title, description)
  VALUES (
    NEW.id,
    'placed',
    'Order Placed',
    'Your order has been received and is being reviewed.'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_first_timeline
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION auto_order_timeline();

-- ─────────────────────────────────────────────────────────────────────────────
-- SKU SEQUENCE
-- Format: BCR-[CAT3]-[YYYY]-[SEQ4]  e.g. BCR-OIL-2025-0001
-- Generate via: 'BCR-' || cat_prefix || '-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('sku_seq')::TEXT, 4, '0')
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS sku_seq START 1;


-- =============================================================================
--  002_rls.sql
-- =============================================================================
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


-- =============================================================================
--  003_seed.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- KUTHARI BEAUTY STORE — Migration 003: Seed Data
-- Run AFTER 002_rls.sql
--
-- Only the super-admin accounts are seeded here. Categories, products,
-- serviceable pincodes and coupons are intentionally NOT seeded — the client
-- is adding their real catalog and coverage area through the admin panel
-- rather than starting from BCR Traders' old grocery demo data.
--
-- INSERT uses ON CONFLICT DO NOTHING so this file is safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── ADMIN PROFILES ───────────────────────────────────────────────────────────
-- A super-admin row must exist before the auth webhook can link the user.
-- `view_unserviceable` is deliberately absent: migration 036 removed that
-- feature along with the unserviceable_attempts table.
INSERT INTO admin_profiles (phone, name, email, role, permissions) VALUES
  ('+918114325023', 'Jyotiranjan Sahoo', 'sahoojyotiranjan595@gmail.com', 'super_admin',
   '{
     "view_orders":              true,
     "update_order_status":      true,
     "manage_products":          true,
     "manage_categories":        true,
     "manage_banners":           true,
     "manage_coupons":           true,
     "manage_pincodes":          true,
     "manage_cms":               true,
     "manage_admin_profiles":    true,
     "manage_delivery_persons":  true,
     "view_analytics":           true,
     "view_abandoned_carts":     true,
     "receive_order_emails":     true,
     "export_data":              true
   }'::jsonb),

  ('+919861235276', 'Vinay', 'kuthari.dev@gmail.com', 'super_admin',
   '{
     "view_orders":              true,
     "update_order_status":      true,
     "manage_products":          true,
     "manage_categories":        true,
     "manage_banners":           true,
     "manage_coupons":           true,
     "manage_pincodes":          true,
     "manage_cms":               true,
     "manage_admin_profiles":    true,
     "manage_delivery_persons":  true,
     "view_analytics":           true,
     "view_abandoned_carts":     true,
     "receive_order_emails":     true,
     "export_data":              true
   }'::jsonb)
ON CONFLICT (phone) DO NOTHING;


-- =============================================================================
--  004_additions.sql
-- =============================================================================
-- ── 17.1  WhatsApp opt-in field on profiles ────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;

-- ── 17.5  Return / Refund ────────────────────────────────────────────────────
-- Note: 'returned' is already included in the orders.status CHECK constraint
-- in 001_schema.sql — no enum type exists, nothing to alter.

-- Track when an order was returned
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

-- ── 17.10  Error log table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_log (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  route      text,
  message    text        NOT NULL,
  code       text,
  stack      text,
  user_id    text,
  created_at timestamptz DEFAULT now()
);

-- Trim old entries automatically (keep last 10 000 rows)
CREATE INDEX IF NOT EXISTS error_log_created_at_idx ON error_log (created_at DESC);


-- =============================================================================
--  005_banner_colors.sql
-- =============================================================================
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


-- =============================================================================
--  006_supabase_native_auth.sql
-- =============================================================================
-- ── Replace Clerk with Supabase Auth as the single identity provider ────────
-- Every person (customer, admin, delivery) becomes a Supabase auth.users row,
-- created after a Message Central phone-OTP verification. Role/profile
-- linkage lives in `profiles` (customers) and `admin_profiles` (staff).
--
-- Pre-launch: profiles/orders/addresses/etc are test data keyed to Clerk user
-- ids that have no Supabase auth.users counterpart, so this migration clears
-- them (TRUNCATE ... CASCADE) rather than attempting a dead migration path.
-- admin_profiles (staff roster: name/phone/role/permissions) is preserved —
-- only the incompatible clerk_user_id column is dropped; staff re-link on
-- their next phone-OTP login (same healing pattern as new customer signups).

-- ── profiles (customers) ────────────────────────────────────────────────────
TRUNCATE TABLE profiles CASCADE;

ALTER TABLE profiles DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── admin_profiles (super_admin / admin / delivery staff) ───────────────────
ALTER TABLE admin_profiles DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE admin_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS admin_profiles_user_id_idx
  ON admin_profiles(user_id) WHERE user_id IS NOT NULL;

-- ── OTP verification binding ─────────────────────────────────────────────────
-- Binds a Message Central verificationId to the phone it was issued for
-- (one-shot, prevents cross-phone OTP replay / account takeover).
CREATE TABLE IF NOT EXISTS otp_verifications (
  verification_id TEXT PRIMARY KEY,
  phone_digits     TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL,
  consumed_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS otp_verifications_phone_idx   ON otp_verifications (phone_digits);
CREATE INDEX IF NOT EXISTS otp_verifications_expires_idx ON otp_verifications (expires_at);

-- Service-role only — no policies, RLS blocks anon/authenticated entirely.
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;


-- =============================================================================
--  007_service_role_grants.sql
-- =============================================================================
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


-- =============================================================================
--  008_orders_schema_fix.sql
-- =============================================================================
-- ── Fix: `orders` table was missing columns the app has always assumed ──────
-- Discovered via live functional testing: /api/orders (checkout) inserts
-- `items`, `address`, `delivery_fee`, `is_bulk` — none of which existed on
-- the live table (which instead had an unused `delivery_address NOT NULL`
-- column that nothing in the codebase ever references). Every order
-- creation attempt, and every admin/customer/delivery order read, has been
-- failing with "column does not exist" — this is not something the Clerk
-- migration introduced; it predates it.

-- `delivery_address` was NOT NULL and unused everywhere — rename rather than
-- add a parallel `address` column, so the NOT NULL constraint stays honest
-- (the app always supplies this field, just under a different column name).
ALTER TABLE orders RENAME COLUMN delivery_address TO address;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_bulk BOOLEAN NOT NULL DEFAULT false;


-- =============================================================================
--  009_product_pack_fields.sql
-- =============================================================================
-- ── Wholesale pack/pricing fields (client catalog spec) ──────────────────────
-- Client's catalog spreadsheet: Full Product Name, Brand, Product Category,
-- Size/Weight, Packaging Form, Pack Type, Units per Pack, Unit Type,
-- Price per Pack, Price per Unit (auto-calculated).
--
-- Mapping to existing schema:
--   Full Product Name -> products.name        (existing)
--   Brand              -> products.brand       (existing column, was never
--                          surfaced in the app — now wired up)
--   Product Category   -> products.category_id (existing)
--   Size / Weight       -> products.unit        (existing, e.g. "850 g", "1 kg")
--   Price per Unit      -> products.price        (existing — the admin form
--                          now auto-computes this from price_per_pack /
--                          units_per_pack, so every existing price/cart/
--                          checkout/order code path is untouched)
--
-- Net-new columns below.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS packaging_form TEXT,
  ADD COLUMN IF NOT EXISTS pack_type TEXT CHECK (pack_type IS NULL OR pack_type IN ('Box', 'Bag')),
  ADD COLUMN IF NOT EXISTS units_per_pack INT CHECK (units_per_pack IS NULL OR units_per_pack > 0),
  ADD COLUMN IF NOT EXISTS unit_type TEXT CHECK (unit_type IS NULL OR unit_type IN ('Pieces', 'Packet')),
  ADD COLUMN IF NOT EXISTS price_per_pack NUMERIC(10,2) CHECK (price_per_pack IS NULL OR price_per_pack >= 0);


-- =============================================================================
--  010_banner_i18n.sql
-- =============================================================================
-- ── Bilingual banner fields ─────────────────────────────────────────────────
-- The admin Banner form (Banners & CMS → Banners) collects Odia copy for the
-- title, subtitle and CTA, and the generated Banner type already declares these
-- columns — but no migration ever added them. Every banner insert/update that
-- included title_or / subtitle_or / cta_text_or therefore failed with
-- `column "…_or" of relation "banners" does not exist`, so banners (and their
-- uploaded images) never saved. Add the columns idempotently.
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS title_or    TEXT,
  ADD COLUMN IF NOT EXISTS subtitle_or TEXT,
  ADD COLUMN IF NOT EXISTS cta_text_or TEXT;


-- =============================================================================
--  011_reconcile_live_schema.sql
-- =============================================================================
-- ── Reconcile live schema with what the code expects ────────────────────────
-- A live-DB audit (PostgREST introspection) found the running database was
-- missing a few columns/tables the code relies on. These are additive and safe
-- — they preserve existing data. Run once in Supabase → SQL Editor.

-- Admin manages a per-pincode delivery ETA; the live serviceable_pincodes table
-- (which the public checkout validates against) had no such column.
ALTER TABLE serviceable_pincodes
  ADD COLUMN IF NOT EXISTS delivery_days int NOT NULL DEFAULT 2;

-- Order returns record when the return happened.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

-- WhatsApp opt-in consent flag (used by the future WhatsApp notification integration).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;

-- Server-side error logging target (lib/logger.ts). Missing table just made
-- logging a silent no-op; create it so errors are captured.
CREATE TABLE IF NOT EXISTS error_log (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  route      text,
  message    text        NOT NULL,
  code       text,
  stack      text,
  user_id    text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS error_log_created_at_idx ON error_log (created_at DESC);


-- =============================================================================
--  012_order_number_format.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Order number format → BCR/<financial-year>/<n>
--   e.g.  BCR/2026-2027/1, BCR/2026-2027/2, …
-- The running number <n> RESETS to 1 at the start of each Indian financial year
-- (1 April – 31 March). A per-FY counter row gives an atomic, gap-free,
-- race-safe sequence — a legal requirement for a GST invoice series.
--
-- Idempotent & self-contained: safe to run even if the live DB's trigger/
-- function have drifted from earlier migrations. Existing orders keep whatever
-- number they already have; only NEW orders use this format.
-- ─────────────────────────────────────────────────────────────────────────────

-- Per-financial-year running counter.
CREATE TABLE IF NOT EXISTS order_counters (
  fy          TEXT PRIMARY KEY,          -- e.g. '2026-2027'
  last_value  INTEGER NOT NULL DEFAULT 0
);

-- Current Indian financial year as 'YYYY-YYYY' (Apr–Mar), in IST.
CREATE OR REPLACE FUNCTION current_financial_year()
RETURNS TEXT AS $$
DECLARE
  d DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  y INT  := EXTRACT(YEAR  FROM d)::INT;
  m INT  := EXTRACT(MONTH FROM d)::INT;
BEGIN
  IF m >= 4 THEN
    RETURN y::TEXT || '-' || (y + 1)::TEXT;
  ELSE
    RETURN (y - 1)::TEXT || '-' || y::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Atomically bump the current FY's counter and return the formatted number.
-- INSERT … ON CONFLICT DO UPDATE takes a row lock, so concurrent orders can
-- never receive the same number.
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  fy   TEXT := current_financial_year();
  n    INT;
BEGIN
  INSERT INTO order_counters (fy, last_value)
       VALUES (fy, 1)
  ON CONFLICT (fy)
  DO UPDATE SET last_value = order_counters.last_value + 1
    RETURNING last_value INTO n;

  RETURN 'BCR/' || fy || '/' || n::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Assign the number on insert only when one wasn't supplied.
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_order_number ON orders;
CREATE TRIGGER trg_orders_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_number();


-- =============================================================================
--  012_product_variants.sql
-- =============================================================================
-- ── Product weight/size variants ────────────────────────────────────────────
-- Lets a product offer selectable options (e.g. 5kg / 10kg) each with its own
-- price and MRP. Stored as a JSONB array of { label, price, mrp }. Empty array
-- means a single-price product (no variant selector shown).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;


-- =============================================================================
--  013_abandoned_carts_unique.sql
-- =============================================================================
-- ── One abandoned-cart row per customer ─────────────────────────────────────
-- The app tracks a single live cart per user (manual upsert by user_id). This
-- unique constraint prevents duplicate rows if two cart-sync requests ever race.
-- Optional — the app already works without it — but recommended for hygiene.

-- De-dup any existing rows first (keep the most recent per user).
DELETE FROM abandoned_carts a
  USING abandoned_carts b
  WHERE a.user_id = b.user_id
    AND a.id <> b.id
    AND a.last_activity < b.last_activity;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'abandoned_carts_user_id_key'
  ) THEN
    ALTER TABLE abandoned_carts
      ADD CONSTRAINT abandoned_carts_user_id_key UNIQUE (user_id);
  END IF;
END $$;


-- =============================================================================
--  013_gst_invoice.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- GST invoice ("claim GST bill") support on orders.
-- When a buyer is reselling and wants to claim input tax credit, they supply
-- their GSTIN + registered business name at checkout. Stored per-order so the
-- tax invoice can print the buyer's GST details.
--
-- A non-null `gstin` also marks the order as a GST/B2B order — used to enforce
-- "GST orders cannot be cancelled once placed".
--
-- Additive & idempotent; safe on the drifted live schema.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS gstin             TEXT,
  ADD COLUMN IF NOT EXISTS gst_business_name TEXT;


-- =============================================================================
--  014_atomic_stock_coupon.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- 014  Atomic stock decrement + coupon usage increment
--
-- PRD Rule #1 / §1.6 (data integrity). The order route previously decremented
-- stock and incremented coupon usage with a read-then-write pattern, which under
-- two concurrent orders can lose an update (both read the old value, both write
-- old-1) → overselling / coupons exceeding max_uses. These functions make each
-- operation a single atomic UPDATE guarded by a WHERE clause, so the database —
-- not the app — enforces "never below zero" and "never past max_uses".
-- ─────────────────────────────────────────────────────────────────────────────

-- Decrease stock only if there is enough; returns the new stock level, or NULL
-- if the guard failed (insufficient stock) so the caller can tell it didn't apply.
create or replace function public.decrement_product_stock(p_product_id uuid, p_qty int)
returns int
language sql
as $$
  update products
     set stock_qty = stock_qty - p_qty,
         updated_at = now()
   where id = p_product_id
     and stock_qty >= p_qty
  returning stock_qty;
$$;

-- Increase a product's stock (used when an order is cancelled/returned).
create or replace function public.increment_product_stock(p_product_id uuid, p_qty int)
returns int
language sql
as $$
  update products
     set stock_qty = stock_qty + p_qty,
         updated_at = now()
   where id = p_product_id
  returning stock_qty;
$$;

-- Increment coupon usage only while under max_uses (NULL max_uses = unlimited).
-- Returns TRUE if the increment applied, FALSE if the coupon is already maxed.
create or replace function public.increment_coupon_use(p_coupon_id uuid)
returns boolean
language plpgsql
as $$
declare
  affected int;
begin
  update coupons
     set uses_count = coalesce(uses_count, 0) + 1
   where id = p_coupon_id
     and (max_uses is null or coalesce(uses_count, 0) < max_uses);
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;


-- =============================================================================
--  014_spices_hanger_pack.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Spices packaging: hanger / pack.
-- For products in the Spices category, the buyer chooses a number of HANGERS or
-- PACKS instead of weight/size variants. Each product defines:
--   • units_per_hanger — how many single units make one hanger
--   • hangers_per_pack — how many hangers make one pack
-- Price basis: the product's `price` is the price per HANGER; a pack's price is
-- computed as hangers_per_pack × price. Total units = quantity × units for the
-- chosen packaging.
--
-- Additive & idempotent; safe on the drifted live schema. Non-spice products
-- leave these NULL and are unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS units_per_hanger INTEGER,
  ADD COLUMN IF NOT EXISTS hangers_per_pack INTEGER;


-- =============================================================================
--  015_packs_per_box.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Box → pack → unit packaging for non-spice products.
-- The admin defines a box's composition:
--   • packs_per_box  — how many packs are in one box
--   • units_per_pack — how many pieces/units are in one pack (already existed)
-- Total units in a box = packs_per_box × units_per_pack. The buyer orders boxes
-- and the cart shows the resulting total unit count.
--
-- Backward compatible: existing box products left packs_per_box NULL are treated
-- as 1 pack per box, so their total units stay = units_per_pack.
--
-- Additive & idempotent; safe on the drifted live schema.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS packs_per_box INTEGER;


-- =============================================================================
--  015_wishlists.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- 015  Wishlists — per-customer saved products (heart button on product cards)
--
-- Service-role-only, like orders/addresses: RLS is enabled with no anon/auth
-- policies, so all access goes through the Next.js API routes using the service
-- role, scoped to the session's profile id. A unique (user_id, product_id)
-- makes add idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlists_user_idx on public.wishlists(user_id);

alter table public.wishlists enable row level security;
-- No policies on purpose: anon/authenticated get no access; the API routes use
-- the service role and scope every query to the caller's own profile id.


-- =============================================================================
--  016_referrals.sql
-- =============================================================================
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


-- =============================================================================
--  016_shopping_lists.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- 016  Shopping lists — a per-customer notes/checklist saved on the user side
--      and surfaced to admins next to abandoned carts (a purchase-intent signal).
--
-- One row per customer; `items` is a JSONB array of { id, text, done }.
-- Service-role-only (RLS on, no anon/auth policies) — accessed via API routes
-- scoped to the caller's profile id.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.shopping_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  items       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

create index if not exists shopping_lists_updated_idx on public.shopping_lists(updated_at desc);

alter table public.shopping_lists enable row level security;
-- No policies on purpose — API routes use the service role, scoped per profile.


-- =============================================================================
--  017_pack_type_unit_type_values.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Widen the products.pack_type / products.unit_type CHECK constraints to the
-- full set of packaging values the catalogue now uses. The old constraints only
-- allowed Box/Bag, which blocked importing products with Box/Bale, Tin/Can,
-- Hanger, Piece (error 23514 products_pack_type_check).
--
-- Safe & idempotent: drops the old constraints if present and re-adds the
-- expanded ones. Run this BEFORE importing products_rows.csv.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pack_type_check;
ALTER TABLE products ADD CONSTRAINT products_pack_type_check
  CHECK (
    pack_type IS NULL OR pack_type IN (
      'Box', 'Box/Bale', 'Bag', 'Tin/Can', 'Hanger', 'Piece'
    )
  );

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_type_check;
ALTER TABLE products ADD CONSTRAINT products_unit_type_check
  CHECK (
    unit_type IS NULL OR unit_type IN (
      'Piece', 'Pieces', 'Packet', 'Pack', 'Bag', 'Sachet',
      'Pouch', 'Bottle', 'Bottle/Pouch', 'Jar', 'Tin', 'Tin/Can'
    )
  );


-- =============================================================================
--  018_fix_order_number_permissions.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: order creation failing after migration 012.
--
-- 012 changed generate_order_number() to bump a counter row in the NEW
-- `order_counters` table. That function runs inside a BEFORE INSERT trigger on
-- `orders`, executing as the CALLING role. If that role has no INSERT/UPDATE
-- grant on order_counters, the trigger errors and EVERY order insert fails
-- ("permission denied for table order_counters") — surfacing in the app as
-- "Failed to create order".
--
-- Fix both ways:
--   1. SECURITY DEFINER so the function always runs with the owner's rights,
--      regardless of which role inserts the order.
--   2. Explicit grants on order_counters as a belt-and-braces fallback.
--
-- Safe & idempotent — re-running is harmless.
-- ─────────────────────────────────────────────────────────────────────────────

-- Make sure the counter table exists (no-op if 012 already created it).
CREATE TABLE IF NOT EXISTS order_counters (
  fy          TEXT PRIMARY KEY,
  last_value  INTEGER NOT NULL DEFAULT 0
);

-- 1. Run the generator with the definer's privileges. A pinned search_path keeps
--    it safe (prevents search_path hijacking on a SECURITY DEFINER function).
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  fy TEXT := current_financial_year();
  n  INT;
BEGIN
  INSERT INTO order_counters (fy, last_value)
       VALUES (fy, 1)
  ON CONFLICT (fy)
  DO UPDATE SET last_value = order_counters.last_value + 1
    RETURNING last_value INTO n;

  RETURN 'BCR/' || fy || '/' || n::TEXT;
END;
$$;

-- current_financial_year() is called from the definer function — pin it too.
CREATE OR REPLACE FUNCTION current_financial_year()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  d DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  y INT  := EXTRACT(YEAR  FROM d)::INT;
  m INT  := EXTRACT(MONTH FROM d)::INT;
BEGIN
  IF m >= 4 THEN
    RETURN y::TEXT || '-' || (y + 1)::TEXT;
  ELSE
    RETURN (y - 1)::TEXT || '-' || y::TEXT;
  END IF;
END;
$$;

-- 2. Fallback grants so the trigger works even without SECURITY DEFINER.
GRANT SELECT, INSERT, UPDATE ON order_counters TO service_role, authenticated, anon;

-- Ask PostgREST to reload its schema cache (picks up any newly added columns,
-- e.g. orders.gstin from migration 013).
NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  019_orders_returned_at.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure orders.returned_at exists so returns can be timestamped.
--
-- It was introduced in 011_reconcile_live_schema.sql, which may never have been
-- run on the live database. Marking an order "Returned" works either way (the
-- app stamps this column best-effort), but running this enables the timestamp.
--
-- Additive & idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  020_packaging_levels.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Two-level packaging: Box → (Hanger | Pack | Tin | Pouch) → Pieces.
--
-- The existing columns already carry the first level, so we reuse them:
--   pack_type      → the BIGGEST unit sold (e.g. 'Box')
--   unit_type      → the LOWER unit the customer can also buy ('Pack','Hanger','Tin')
--   units_per_pack → how many LOWER units are in one box   (e.g. 10 packs)
--
-- What was missing (added here, left NULL for the admin to fill in):
--   pieces_per_secondary → how many PIECES are in one lower unit (e.g. 10)
--   secondary_price/mrp  → optional per-lower-unit pricing; when NULL the app
--                          derives it as box price ÷ units_per_pack
--
-- Total pieces in a box = units_per_pack × pieces_per_secondary.
--   Everest 200gm: 10 packs/box × 10 pieces/pack   = 100 pieces
--   Small masala : 20 hangers/box × 60 pieces/hanger = 1,200 pieces
--
-- Additive & idempotent — existing products are unaffected until the admin
-- fills the new fields in.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pieces_per_secondary INTEGER,
  ADD COLUMN IF NOT EXISTS secondary_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS secondary_mrp        NUMERIC(10,2);

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  021_pack_type_add_pack_bottle.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Widen products.pack_type for the client's Vyapar stock sheet.
--
-- Its "Unit" column uses PACKS (63 products) and BOTTLES, which the existing
-- check constraint rejects — importing would fail with error 23514 exactly like
-- Box/Bale did before.
--
-- Safe & idempotent. Run BEFORE 022_import_vyapar_stock.sql.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pack_type_check;
ALTER TABLE products ADD CONSTRAINT products_pack_type_check
  CHECK (
    pack_type IS NULL OR pack_type IN (
      'Box', 'Box/Bale', 'Pack', 'Bag', 'Tin/Can', 'Hanger', 'Bottle', 'Piece'
    )
  );

-- The lower unit ("unit_type") likewise needs Hanger/Pack.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_type_check;
ALTER TABLE products ADD CONSTRAINT products_unit_type_check
  CHECK (
    unit_type IS NULL OR unit_type IN (
      'Piece', 'Pieces', 'Packet', 'Pack', 'Bag', 'Sachet', 'Hanger',
      'Pouch', 'Bottle', 'Bottle/Pouch', 'Jar', 'Tin', 'Tin/Can'
    )
  );

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  022_import_vyapar_stock.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Packaging + prices imported from "Stock Vyapar.xlsx".
--
-- SPICES (Box -> Hanger -> Piece). Sheet: Unit=Hanger, "20H*60piece", "220/H"
--   => 20 hangers per box, 60 pieces per hanger, Rs.220 per HANGER.
--   -> pack_type='Box', units_per_hanger=60, hangers_per_pack=20, price=220
--   The customer can buy a whole Box (Rs.4,400 / 1,200 pieces) or Hangers
--   (Rs.220 / 60 pieces). The box price is derived, never stored.
--
-- EVERYTHING ELSE (Box -> Pack -> Piece)
--   Unit -> pack_type; "8packs*8piece" -> Pack, 8 per box, 8 pieces each;
--   "20piece" -> single level. Plain Sale Price = price of one primary unit.
--
-- Prices are money, so nothing is guessed: per-piece prices on PACKS items are
-- left blank for the admin (see VYAPAR_NEEDS_ADMIN.txt).
--
-- Matches by name. Run migrations 020 and 021 FIRST.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Prerequisite check. Without 021 the pack_type CHECK constraint still rejects
-- 'Pack'/'Bottle' and this import dies on the first PACKS product with an
-- opaque "violates check constraint products_pack_type_check" (error 23514).
-- Fail immediately with an actionable message instead.
DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint WHERE conname = 'products_pack_type_check';

  IF v_def IS NOT NULL AND v_def NOT LIKE '%''Pack''%' THEN
    RAISE EXCEPTION
      'Run 021_pack_type_add_pack_bottle.sql before this migration. The pack_type check constraint does not allow ''Pack'' yet, so importing the PACKS products would fail.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'products' AND column_name = 'pieces_per_secondary'
  ) THEN
    RAISE EXCEPTION
      'Run 020_packaging_levels.sql before this migration. The products.pieces_per_secondary column does not exist yet.';
  END IF;
END;
$$;

UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20 WHERE name = 'Alpha 375g';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Alpha 750g';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=16 WHERE name = 'Alpha 750g (1x16)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type='Pack', units_per_pack=8, pieces_per_secondary=8, price=890 WHERE name = 'Amul Butter 200gm';
UPDATE products SET pack_type='Piece', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12 WHERE name = 'Amul Cow Ghee 1kg';
UPDATE products SET pack_type='Piece', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12 WHERE name = 'Amul fresh cream 1kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'Amul Mithai maid 200gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=120, price=5650 WHERE name = 'Amulspray 100gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12, price=5410 WHERE name = 'Amulspray 1kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60, price=5630 WHERE name = 'Amulspray 200gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=24, price=5580 WHERE name = 'Amulspray 500gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=480, price=4320 WHERE name = 'Amulspray Rs-10';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30, price=1460 WHERE name = 'Ashirvaad Atta 1kg';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=6, price=1385 WHERE name = 'Ashirvaad Atta 5kg';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30 WHERE name = 'Ashirvaad Salt 1kg';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=25 WHERE name = 'Bambino Semiya 1kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Best Choice 650g';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'BHARAT Black Pepper(5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'BH Chaat Masala 50gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'BH Chicken Masala (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'BH Chilly Powder (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'BH Chilly Powder 100gm';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=32 WHERE name = 'BH Chilly Powder 500gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'BH Coriander Powder 100gm';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=32 WHERE name = 'BH Coriander Powder 500gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'BH Curry (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'BH Curry Powder 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'BH Dhania Powder (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'BH Garam Masala (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'BH haldi 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'BH Haldi powder (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'BH Jeera Powder (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=32 WHERE name = 'BH Jeera Powder 500gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'BH Jeera Powder100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'BH Meat Masala 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'BH Soda 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'BH Turmeric Powder 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=32 WHERE name = 'BH Turmeric Powder 500gm';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2160 WHERE name = 'Chana Dal 30kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=180 WHERE name = 'Dalda 100gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=32, price=2480 WHERE name = 'Dalda 420gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20, price=3080 WHERE name = 'Dalda 840gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=360 WHERE name = 'Dalda rs-10';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12, price=2220 WHERE name = 'Double Hiran  M 1ltr Bottle';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=24, price=2244 WHERE name = 'DH M 1/2 ltr Bottle';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=72, price=1485 WHERE name = 'DH M 100gm Bottle';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12, price=2172 WHERE name = 'DH M 1ltr pouch';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=36, price=1440 WHERE name = 'DH M 200gm Bottle';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=36, price=475 WHERE name = 'DH M 50gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=2, price=930 WHERE name = 'DH M 5L Jar';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12 WHERE name = 'Dhara M oil (1x12)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12 WHERE name = 'Dhara RB oil (1x12)';
UPDATE products SET pack_type='Hanger', unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30, units_per_hanger=NULL, hangers_per_pack=NULL, price=235 WHERE name = 'Everest Biriyani Masala 10/-';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Black Pepper 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Chaat Masala 100gm';
UPDATE products SET pack_type='Box', units_per_hanger=60, hangers_per_pack=20, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=220 WHERE name = 'Ev Chicken Masala (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Chicken Masala 100gm';
UPDATE products SET pack_type='Piece', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=619 WHERE name = 'Ev Chicken masala 1kg';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=15 WHERE name = 'Ev Chicken Masala 200gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Chicken Masala 50gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=5 WHERE name = 'Ev Dhania  Powder 500gm';
UPDATE products SET pack_type='Box', units_per_hanger=60, hangers_per_pack=20, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=230 WHERE name = 'Ev Dhania Powder (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Dhania Powder 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20 WHERE name = 'EV Dhania powder 50g';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Fish Curry 50gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Garam Masala 100gm';
UPDATE products SET pack_type='Box', units_per_hanger=60, hangers_per_pack=20, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=180 WHERE name = 'Ev Ginger Garlic (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Ginger Garlic 100gm';
UPDATE products SET pack_type='Box', units_per_hanger=60, hangers_per_pack=20, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=228 WHERE name = 'Ev Haldi  (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Haldi 100gm';
UPDATE products SET pack_type='Piece', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=355 WHERE name = 'Ev Haldi 1kg Jar';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=5 WHERE name = 'Ev Haldi 500gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20 WHERE name = 'Ev Haldi Powder 50gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Hingu 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30 WHERE name = 'EV Hingu 10g';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Hingu 25gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Hingu 50gm';
UPDATE products SET pack_type='Box', units_per_hanger=60, hangers_per_pack=20, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=90 WHERE name = 'Ev Jaljeera (2)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Jaljeera 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Jaljeera 50gm';
UPDATE products SET pack_type='Box', units_per_hanger=60, hangers_per_pack=20, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=228 WHERE name = 'Ev Jeera powder (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Jeera Powder 100gm';
UPDATE products SET pack_type='Piece', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=5, price=329 WHERE name = 'Ev Jeera Powder 500gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20 WHERE name = 'Ev Jeera powder 50g';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Kashmirlal Chilly 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Kasturi Methi 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Kitchen king 100gm';
UPDATE products SET pack_type='Box', units_per_hanger=60, hangers_per_pack=20, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=220 WHERE name = 'Ev Meat Masala (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Meat Masala 100gm';
UPDATE products SET pack_type='Piece', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=619 WHERE name = 'Ev Meat Masala 1kg';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'Ev Meat Masala 200gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Meat Masala 50gm';
UPDATE products SET pack_type='Piece', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=250 WHERE name = 'Ev Shahi Biriyani 200gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Shahi Biriyani 50gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Shahi Paneer 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Shahi Paneer 50gm';
UPDATE products SET pack_type='Box', units_per_hanger=60, hangers_per_pack=20, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=228 WHERE name = 'Ev Tikhalal chilly (5)';
UPDATE products SET pack_type='Hanger', unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30, units_per_hanger=NULL, hangers_per_pack=NULL, price=230 WHERE name = 'Ev Tikhalal chilly 10/-';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev Tikhalal chilly 100gm';
UPDATE products SET pack_type='Piece', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=451 WHERE name = 'Ev Tikhalal chilly 1kg';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=5 WHERE name = 'Ev Tikhalal chilly 500gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20 WHERE name = 'Ev Tikhalal chilly 50g';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ev White Pepper 100gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10, price=1680 WHERE name = 'Fiona SF Pouch (1x10)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20 WHERE name = 'FirstKlass 375g';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10, price=1215 WHERE name = 'FirstKlass 750g';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2700 WHERE name = 'Fortune M 15ltr Tin';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=16, price=2800 WHERE name = 'Fortune M oil 1ltr pouch (1x16)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12 WHERE name = 'Fortune R/B 870gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20 WHERE name = 'Fortune SF 800gm (1x20)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=16, price=2580 WHERE name = 'Fortune SF 840gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Freedom M (1x10) Pouch';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=80 WHERE name = 'Freedom M 100ml (1x80)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=16, price=2816 WHERE name = 'Freedom M 1ltr  pouch(1x16)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=40 WHERE name = 'Freedom M 200ml';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=24 WHERE name = 'Freedom M 500ml';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=16, price=2656 WHERE name = 'Freedom R/B (1x16)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=15 WHERE name = 'Freedom SF (1x15)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=16, price=2760 WHERE name = 'Freedom SF (1x16)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=24, price=2140 WHERE name = 'Freedom SF 1/2ltr (1x24)Bottle';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20 WHERE name = 'Freedom SF 1/2ltr pouch (1x20)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12, price=2112 WHERE name = 'Freedom SF 1ltr (1X12)Bottle';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=6 WHERE name = 'Freedom SF 2ltr';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=4 WHERE name = 'Freedom SF 5ltr';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'Freedom SF Tin 15ltr';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20 WHERE name = 'Freshline 275gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10, price=840 WHERE name = 'Freshline 550gm';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2150 WHERE name = 'Ganesh Oil Tin 15ltr';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=16, price=2010 WHERE name = 'Ganesh Tin 13.5kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Goldwinner R/B 850g';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10, price=1680 WHERE name = 'Goldwinner SF 1ltr Pouch';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20, price=1700 WHERE name = 'Goldwinner SF 500ml Pouch';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=3, price=2625 WHERE name = 'Goldwinner SF 5Ltr';
UPDATE products SET units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10, price=1460 WHERE name = 'Goldwinner SF 850g Pouch';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'Goldwinner Tin 13kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12 WHERE name = 'Janmay M (1x12)';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'Janmay M Tin';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'Janmay SF Tin';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30 WHERE name = 'Kg Ghee 400gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=15 WHERE name = 'Kg Ghee 800 gm';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'Kg Tin 15ltr';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'KPR Sugar 50kg';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=25, price=870 WHERE name = 'Lingaraj Atta 1kg';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2390 WHERE name = 'M 30 Sugar 50kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30, price=2370 WHERE name = 'Maa castor oil 1/2ltr';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=15, price=2310 WHERE name = 'Maa castor oil 1ltr';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=3, price=2310 WHERE name = 'Maa castor Oil 5Ltr';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2190 WHERE name = 'Maa castor oil Tin';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=3180 WHERE name = 'Mahabir Batak 30 Kg (Polish)';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=3210 WHERE name = 'Mahabir Batak 30 kg (UnPolish)';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'Mangala Besan 1kg';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2100 WHERE name = 'Masoori Dal 30kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20, price=1220 WHERE name = 'Mehek gold 375g';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10, price=1205 WHERE name = 'Mehek Gold 750gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'Nestle Milkmaid 5kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=15, price=1875 WHERE name = 'Om Castor 800gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30, price=1935 WHERE name = 'Om Castor Oil 400gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20, price=3300 WHERE name = 'Pooja oil (1x20)';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=4, price=930 WHERE name = 'Prabhuji Semiya Bag 4x5kg';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL WHERE name = 'Ruchi Gold 15ltr Tin';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20, price=1240 WHERE name = 'Ruchi Gold 375gm (1x20)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10, price=1225 WHERE name = 'Ruchi Gold 750gm (1x10)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10, price=1390 WHERE name = 'Ruchi Gold 850gm (1x10)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ruchi Curry Powder 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'Ruchi Curry Powder 5/-';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Ruchi Curry Powder 50gm';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2340 WHERE name = 'S 30 Sugar 50kg';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2340 WHERE name = 'S1-30 Sugar 50kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=150, price=10500 WHERE name = 'SuryaChandra Ghee 100gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=15, price=10350 WHERE name = 'SuryaChandra  Ghee 1ltr Pouch';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=15 WHERE name = 'SuryaChandra  Ghee 1ltr Tin';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=75, price=10500 WHERE name = 'SuryaChandra  Ghee 200gm';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30, price=10650 WHERE name = 'SuryaChandra  Ghee 500gm Jar';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30 WHERE name = 'SuryaChandra  Ghee 500ml Pouch';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type='Pack', units_per_pack=15, pieces_per_secondary=60, price=7590 WHERE name = 'SuryaChandra  Ghee Rs10';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=4, price=13000 WHERE name = 'SuryaChandra  Jar 5ltr';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12, price=3600 WHERE name = 'Shalimar coconut oil 1ltr';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12 WHERE name = 'Shalimar sf oil 1ltr';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=1700 WHERE name = 'Sooji 50kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Sooprlife 800gm (1x10)';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2450 WHERE name = 'Sooprlife Tin';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=3660 WHERE name = 'Sree Biridal 30kg';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2480 WHERE name = 'Sunpure 15ltr';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=20 WHERE name = 'Sunpure 400gm (1x20)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=4, price=3520 WHERE name = 'Sunpure 5ltr Jar';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Sunpure 800gm (1x10)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'Tata Chicken Masala (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=60 WHERE name = 'Tata Garam masala (5)';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10 WHERE name = 'Tata Hingu 100gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=28 WHERE name = 'Tata Hingu 10gm';
UPDATE products SET pack_type='Pack', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=18 WHERE name = 'Tata Hingu 25gm';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=18 WHERE name = 'Tata Salt 1kg(1x50)';
UPDATE products SET pack_type='Bottle', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=4, price=3080 WHERE name = 'TT Castor Oil  5 ltr';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=30, price=2370 WHERE name = 'TT castor oil 1/2ltr';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=15, price=2310 WHERE name = 'TT castor oil 1ltr';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=50, price=1800 WHERE name = 'TT castor oil 200ml';
UPDATE products SET pack_type='Tin/Can', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=NULL, price=2190 WHERE name = 'TT castor oil Tin';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=25, price=1210 WHERE name = 'Tulsi Atta 1kg';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=5, price=1210 WHERE name = 'Tulsi Atta 5kg';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=25, price=900 WHERE name = 'Visakha Atta 1kg';
UPDATE products SET pack_type='Bag', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=5, price=900 WHERE name = 'Visakha Atta 5kg';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=12, price=2088 WHERE name = 'Vitalife M. (1x12)';
UPDATE products SET pack_type='Box', units_per_hanger=NULL, hangers_per_pack=NULL, unit_type=NULL, units_per_pack=NULL, pieces_per_secondary=10, price=2016 WHERE name = 'Vitalife sf (1x10)';

COMMIT;


-- =============================================================================
--  023_fix_order_number_ambiguous_fy.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: EVERY order insert fails with
--        ERROR 42702: column reference "fy" is ambiguous
--
-- generate_order_number() (migrations 012 and 018) declared a PL/pgSQL variable
-- called `fy`, while order_counters has a COLUMN called `fy`:
--
--     DECLARE fy TEXT := current_financial_year();
--     INSERT INTO order_counters (fy, last_value) VALUES (fy, 1)
--     ON CONFLICT (fy) ...          -- ← the variable, or the column? Postgres
--                                   --   won't guess, so it aborts.
--
-- That function runs in a BEFORE INSERT trigger on `orders`, so the ambiguity
-- fails the whole insert and the app reports "Failed to create order".
-- Migration 018 carried the same bug, which is why running it didn't help.
--
-- Fix: name the variables so they CANNOT collide with a column (v_fy / v_n) and
-- alias the table so the UPDATE/RETURNING clauses are explicit about what they
-- mean. Keeps 018's SECURITY DEFINER + pinned search_path.
--
-- Safe & idempotent. Existing orders keep their numbers; the counter is
-- untouched, so the BCR/<FY>/<n> series stays gap-free.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_counters (
  fy          TEXT PRIMARY KEY,
  last_value  INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fy TEXT := current_financial_year();
  v_n  INT;
BEGIN
  -- ON CONFLICT DO UPDATE takes a row lock, so two orders placed at the same
  -- instant can never be handed the same number.
  INSERT INTO order_counters AS oc (fy, last_value)
       VALUES (v_fy, 1)
  ON CONFLICT (fy)
  DO UPDATE SET last_value = oc.last_value + 1
    RETURNING oc.last_value INTO v_n;

  RETURN 'BCR/' || v_fy || '/' || v_n::TEXT;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON order_counters TO service_role, authenticated, anon;

-- Prove the function actually runs before any customer hits it. The inner block
-- is a subtransaction, so the deliberate abort rolls the counter bump back and
-- this probe consumes no order number.
DO $$
DECLARE
  v_probe TEXT;
BEGIN
  BEGIN
    v_probe := generate_order_number();
    RAISE NOTICE 'generate_order_number() OK -> %', v_probe;
    RAISE EXCEPTION 'undo_probe';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'undo_probe' THEN
        RAISE EXCEPTION 'generate_order_number() is still broken: %', SQLERRM;
      END IF;
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  024_fix_coupon_double_increment.sql
-- =============================================================================
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


-- =============================================================================
--  025_fix_orders_status_check.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: an order can be confirmed but never moved past it —
--        new row for relation "orders" violates check constraint
--        "orders_status_check"
--
-- 001_schema.sql pinned the status constraint to the original workflow:
--   placed, confirmed, assigned, processing, out_for_delivery, delivered,
--   cancelled, returned
--
-- The app has since moved to (src/types/database.types.ts OrderStatus):
--   placed, confirmed, packed, shipping, delivered, cancelled, returned
--
-- No migration ever widened the constraint, so 'packed' and 'shipping' — the two
-- steps immediately after 'confirmed' — are rejected by the database. That's why
-- confirming works and every later transition fails.
--
-- The legacy values are kept in the list. Any order still sitting on
-- 'assigned'/'processing'/'out_for_delivery' would otherwise fail revalidation
-- and this migration would abort.
--
-- Safe & idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    -- current workflow
    'placed', 'confirmed', 'packed', 'shipping', 'delivered', 'cancelled', 'returned',
    -- legacy, retained so pre-existing rows still validate
    'assigned', 'processing', 'out_for_delivery'
  ));

-- Prove every status the app can set is now accepted, so this can't silently
-- half-fix the workflow. The subtransaction is rolled back; no data changes.
DO $$
DECLARE
  v_status TEXT;
  v_order  UUID;
BEGIN
  SELECT id INTO v_order FROM orders LIMIT 1;
  IF v_order IS NULL THEN
    RAISE NOTICE 'No orders yet — constraint widened, nothing to probe.';
    RETURN;
  END IF;

  FOREACH v_status IN ARRAY ARRAY['placed','confirmed','packed','shipping','delivered','cancelled','returned']
  LOOP
    BEGIN
      UPDATE orders SET status = v_status WHERE id = v_order;
      RAISE EXCEPTION 'undo_probe';
    EXCEPTION
      WHEN check_violation THEN
        RAISE EXCEPTION 'status "%" is still rejected by orders_status_check', v_status;
      WHEN OTHERS THEN
        IF SQLERRM <> 'undo_probe' THEN RAISE; END IF;
    END;
  END LOOP;
  RAISE NOTICE 'All 7 order statuses accepted.';
END;
$$;

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  026_product_delivery_charge.sql
-- =============================================================================
-- ─────────────────────────────────────────────────────────────────────────────
-- Per-product delivery charge, toggled on/off by the admin.
--
--   delivery_charge          the amount (₹) to charge for delivering this product
--   delivery_charge_enabled  whether that charge currently applies
--
-- Both are optional and default to "no charge", so existing products and orders
-- are unaffected until an admin turns a charge on. Additive & idempotent.
--
-- Run this BEFORE saving a product with a delivery charge — the admin form now
-- writes these columns, and naming a column that doesn't exist would fail the
-- whole product save.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS delivery_charge         NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_charge_enabled BOOLEAN       NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  027_price_updated_at.sql
-- =============================================================================
-- 027: track when a product's CURRENT price took effect.
--
-- Needed for the Product JSON-LD `offers.validFrom` (Google Merchant listing).
-- Without a real timestamp the page would have to emit "now" on every request,
-- which resets on each render and misrepresents when the price actually started.

ALTER TABLE products ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;

-- Backfill from the row's own last-modified time — the most recent REAL
-- timestamp we hold for existing rows. It is never EARLIER than the moment the
-- current price took effect, so it cannot overstate how long that price has
-- been valid (an invented earlier date would).
UPDATE products
   SET price_updated_at = COALESCE(updated_at, created_at)
 WHERE price_updated_at IS NULL;

-- Keep it honest from here on: stamp ONLY when `price` actually changes, so a
-- routine edit (description, images, stock) never moves the price date. Done in
-- the DB rather than the API so it holds for every write path — PUT, PATCH,
-- imports and manual SQL alike.
CREATE OR REPLACE FUNCTION set_price_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.price_updated_at := COALESCE(NEW.price_updated_at, NOW());
  ELSIF NEW.price IS DISTINCT FROM OLD.price THEN
    NEW.price_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_price_updated_at ON products;
CREATE TRIGGER trg_price_updated_at
  BEFORE INSERT OR UPDATE OF price ON products
  FOR EACH ROW EXECUTE FUNCTION set_price_updated_at();


-- =============================================================================
--  028_ganjam_post_offices.sql
-- =============================================================================
-- 028: official India Post directory for Ganjam district (data.gov.in).
--
-- Backs the area <-> pincode lookup on the admin "Serviceable PINs" screen.
-- Previously that screen called api.postalpincode.in on every keystroke-ish
-- lookup: a network hop with a 6s timeout that could fail, and whose area
-- search needs a near-exact name rather than a prefix. This is reference data
-- that changes maybe once a year, so it belongs in our own DB.
--
-- This is a LOOKUP/reference table only. It does NOT decide serviceability —
-- serviceable_pincodes remains the single source of truth for that. An admin
-- picks from here, then the chosen row is saved into serviceable_pincodes.

CREATE TABLE IF NOT EXISTS ganjam_post_offices (
  id          BIGSERIAL PRIMARY KEY,
  pincode     TEXT NOT NULL CHECK (pincode ~ '^\d{6}$'),
  area_name   TEXT NOT NULL,
  office_type TEXT,
  sub_office  TEXT,
  division    TEXT,
  -- The same place name legitimately repeats across pincodes in this district,
  -- so the identity is the pair, not the name.
  UNIQUE (pincode, area_name)
);

CREATE INDEX IF NOT EXISTS idx_gpo_pincode ON ganjam_post_offices (pincode);

-- Substring search on the area name ("nuagam" should find "Gosaninuagam B.O"),
-- which a plain b-tree can't serve. Trigram GIN handles ILIKE '%x%'.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_gpo_area_trgm ON ganjam_post_offices USING gin (area_name gin_trgm_ops);

-- Reference data reached only through the admin-gated /api/pincodes/lookup
-- route, which uses the service-role client. RLS on with no policy = no direct
-- anon/authenticated access; the service role bypasses it.
ALTER TABLE ganjam_post_offices ENABLE ROW LEVEL SECURITY;


-- =============================================================================
--  029_banner_display_seconds.sql
-- =============================================================================
-- 029: how long each banner stays on screen before the carousel advances.
--
-- The hero carousel used a hardcoded 5s for every slide, so an admin had no way
-- to give a busier banner longer to be read. This is per-banner rather than one
-- global speed: a global setting is just the case where every row holds the
-- same value, so per-banner covers both.
--
-- Defaults to 5 so existing rows keep exactly the current behaviour.
-- Bounded 1..60: a 0 would spin the carousel continuously and something like
-- 3600 would look broken/stuck to a customer.

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS display_seconds INT NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'banners_display_seconds_range'
  ) THEN
    ALTER TABLE banners
      ADD CONSTRAINT banners_display_seconds_range
      CHECK (display_seconds BETWEEN 1 AND 60);
  END IF;
END $$;


-- =============================================================================
--  030_coupon_marquee_message.sql
-- =============================================================================
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


-- =============================================================================
--  031_coupon_uses_per_customer.sql
-- =============================================================================
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


-- =============================================================================
--  032_order_number_prefix_bcrt.sql
-- =============================================================================
-- 032: order-number / invoice-number prefix  BCR/  ->  BCRT/
--   e.g.  BCR/2026-2027/5   becomes   BCRT/2026-2027/5
--
-- Pure rebrand. Identical to migration 023 in every other respect (same
-- financial-year source, same locked counter so numbers can't collide).
--
-- Affects NEW orders only. Existing rows keep their stored order_number — those
-- are historical invoice numbers and must not be rewritten.

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fy TEXT := current_financial_year();
  v_n  INT;
BEGIN
  -- ON CONFLICT DO UPDATE takes a row lock, so two orders placed at the same
  -- instant can never be handed the same number.
  INSERT INTO order_counters AS oc (fy, last_value)
       VALUES (v_fy, 1)
  ON CONFLICT (fy)
  DO UPDATE SET last_value = oc.last_value + 1
    RETURNING oc.last_value INTO v_n;

  RETURN 'BCRT/' || v_fy || '/' || v_n::TEXT;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON order_counters TO service_role, authenticated, anon;

-- Prove the function runs before any customer hits it. The inner block is a
-- subtransaction, so the deliberate abort rolls the counter bump back and this
-- probe consumes no order number.
DO $$
DECLARE
  v_probe TEXT;
BEGIN
  BEGIN
    v_probe := generate_order_number();
    RAISE NOTICE 'generate_order_number() OK -> %', v_probe;
    RAISE EXCEPTION 'undo_probe';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'undo_probe' THEN
        RAISE EXCEPTION 'generate_order_number() is still broken: %', SQLERRM;
      END IF;
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  033_referral_redemptions.sql
-- =============================================================================
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


-- =============================================================================
--  034_delivery_vehicles.sql
-- =============================================================================
-- 034: admin-managed delivery lorries/vehicles + per-order transport details.
--
-- The admin maintains a list of lorries (number, name, phone, active). At
-- checkout the customer either picks one of the active lorries or types their
-- own transport details; the chosen text is snapshotted onto the order so the
-- invoice reflects exactly what was selected at order time (a later edit to the
-- vehicle list never rewrites a past invoice).

CREATE TABLE IF NOT EXISTS delivery_vehicles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number        TEXT NOT NULL,               -- e.g. OD-07-AB-1234
  name          TEXT,                        -- transporter / driver name
  phone         TEXT,                        -- contact number
  is_active     BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_vehicles_active
  ON delivery_vehicles (display_order) WHERE is_active = true;

-- Text snapshot of the transport chosen for this order (a picked lorry formatted
-- as "number · name · phone", or the customer's own typed details). NULL when
-- none was chosen.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS transport_details TEXT;

-- Reference data reached only through admin-gated routes (service role) plus a
-- public read of the ACTIVE list for checkout. RLS on with no policy blocks
-- direct anon/authenticated access; the service role bypasses it.
ALTER TABLE delivery_vehicles ENABLE ROW LEVEL SECURITY;


-- =============================================================================
--  035_order_number_prefix_kbs.sql
-- =============================================================================
-- 035: order-number / invoice-number prefix  BCRT/  ->  KBS/
--   e.g.  BCRT/2026-2027/5   becomes   KBS/2026-2027/5
--
-- Pure rebrand for Kuthari Beauty Store. Identical to migration 032 in every
-- other respect (same financial-year source, same locked counter so numbers
-- can't collide).
--
-- Safe here because this is a fresh database with no historical orders. On a
-- database that already had orders, existing rows would keep their stored
-- order_number — those are historical invoice numbers and must not be rewritten.

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fy TEXT := current_financial_year();
  v_n  INT;
BEGIN
  -- ON CONFLICT DO UPDATE takes a row lock, so two orders placed at the same
  -- instant can never be handed the same number.
  INSERT INTO order_counters AS oc (fy, last_value)
       VALUES (v_fy, 1)
  ON CONFLICT (fy)
  DO UPDATE SET last_value = oc.last_value + 1
    RETURNING oc.last_value INTO v_n;

  RETURN 'KBS/' || v_fy || '/' || v_n::TEXT;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON order_counters TO service_role, authenticated, anon;

-- Prove the function runs before any customer hits it. The inner block is a
-- subtransaction, so the deliberate abort rolls the counter bump back and this
-- probe consumes no order number.
DO $$
DECLARE
  v_probe TEXT;
BEGIN
  BEGIN
    v_probe := generate_order_number();
    RAISE NOTICE 'generate_order_number() OK -> %', v_probe;
    RAISE EXCEPTION 'undo_probe';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'undo_probe' THEN
        RAISE EXCEPTION 'generate_order_number() is still broken: %', SQLERRM;
      END IF;
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  036_retail_pricing_and_pincode_delivery.sql
-- =============================================================================
-- 036: Retail-first rebuild.
--
-- The client moved from wholesale-only to selling retail as well, and now ships
-- all over India instead of only Ganjam district. Three changes:
--
--   1. Products carry a RETAIL price/MRP alongside the existing wholesale pair.
--      `price`/`mrp` keep their meaning (wholesale); the new columns are the
--      retail equivalents. Both are offered to the customer as selectable buy
--      options — whichever they pick becomes its own cart line.
--
--   2. Pincodes carry their own delivery charge. The pincode table stops being
--      a serviceability allow-list and becomes a delivery-rate lookup: any
--      pincode not listed simply falls back to the default rate in code.
--
--   3. The unserviceable-attempt tracking is dropped — with all-India delivery
--      there is no such thing as an unserviceable pincode.

-- ── 1. Retail pricing ────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS retail_mrp   NUMERIC(10,2);

COMMENT ON COLUMN products.retail_price IS
  'Per-unit retail selling price. NULL = this product is wholesale-only.';
COMMENT ON COLUMN products.retail_mrp IS
  'Retail strikethrough MRP. Optional even when retail_price is set.';

-- ── 2. Per-pincode delivery charge ───────────────────────────────────────────
-- NULL means "not set" and falls back to the default rate in code, which is
-- deliberately different from an explicit 0 (genuinely free delivery there).
ALTER TABLE serviceable_pincodes
  ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2);

COMMENT ON COLUMN serviceable_pincodes.delivery_charge IS
  'Delivery charge for this pincode. NULL = use the default rate in code; 0 = free delivery to this pincode.';

-- The table no longer gates ordering, so `is_active` would silently make a
-- pincode "unreachable" again. Force every existing row active and default new
-- rows to active; the column is kept so the admin can still hide a stale row
-- from the list without losing its rate.
UPDATE serviceable_pincodes SET is_active = true WHERE is_active IS DISTINCT FROM true;

-- ── 3. Drop unserviceable tracking ───────────────────────────────────────────
-- Safe: this database is new and the table holds no rows.
DROP TABLE IF EXISTS unserviceable_attempts CASCADE;

NOTIFY pgrst, 'reload schema';


-- =============================================================================
--  037_seed_categories.sql
-- =============================================================================
-- 037: Seed the storefront categories.
--
-- Starting set for Kuthari Beauty Store. The admin can rename, reorder,
-- deactivate or add to these freely — this only guarantees the store isn't
-- empty on first run.
--
-- The slugs MUST stay in step with CAT_CODES in src/app/api/products/route.ts,
-- which turns a slug into the SKU segment (skincare -> KBS-SKN-2026-0001).
-- An unlisted slug silently falls back to 'GEN'.
--
-- ON CONFLICT DO NOTHING so re-running never clobbers admin edits (renames,
-- images, display order, or a category switched off).

INSERT INTO categories (name, slug, description, display_order, is_active, meta_title, meta_description) VALUES

  ('Skincare', 'skincare',
   'Face wash, moisturisers, serums, sunscreen and treatments for every skin type.',
   1, true,
   'Buy Skincare Online — Face Wash, Moisturiser, Serum | Kuthari Beauty Store',
   'Shop skincare at Kuthari Beauty Store. Face wash, moisturisers, serums and sunscreen from trusted brands. Buy a single piece at retail price or order in bulk.'),

  ('Haircare', 'haircare',
   'Shampoo, conditioner, hair oil, masks and serums for everyday hair care.',
   2, true,
   'Buy Haircare Online — Shampoo, Conditioner, Hair Oil | Kuthari Beauty Store',
   'Shop haircare at Kuthari Beauty Store. Shampoo, conditioner, hair oil, masks and serums. Retail single pieces or bulk box rates.'),

  ('Hair Colour', 'hair-colour',
   'Hair colour, henna, bleach and developers — salon and home use.',
   3, true,
   'Buy Hair Colour Online — Hair Dye, Henna, Bleach | Kuthari Beauty Store',
   'Shop hair colour at Kuthari Beauty Store. Hair dye, henna, bleach and developers for salon and home use. Retail or bulk.'),

  ('Makeup', 'makeup',
   'Lipstick, foundation, kajal, eyeliner, compact and the rest of the kit.',
   4, true,
   'Buy Makeup Online — Lipstick, Foundation, Kajal | Kuthari Beauty Store',
   'Shop makeup at Kuthari Beauty Store. Lipstick, foundation, kajal, eyeliner and compacts from genuine brands. Single pieces or bulk.'),

  ('Nail Care', 'nail-care',
   'Nail polish, removers, nail art and manicure essentials.',
   5, true,
   'Buy Nail Polish & Nail Care Online | Kuthari Beauty Store',
   'Shop nail care at Kuthari Beauty Store. Nail polish, removers, nail art and manicure essentials. Retail or bulk rates.'),

  ('Fragrances & Deodorants', 'fragrances-deodorants',
   'Perfumes, body sprays, deodorants and roll-ons.',
   6, true,
   'Buy Perfume & Deodorant Online | Kuthari Beauty Store',
   'Shop fragrances at Kuthari Beauty Store. Genuine branded perfumes, body sprays, deodorants and roll-ons. Single pieces or full boxes.'),

  ('Men''s Grooming', 'mens-grooming',
   'Shaving, beard care, face wash, hair styling and grooming kits for men.',
   7, true,
   'Buy Men''s Grooming Products Online — Shaving, Beard Care | Kuthari Beauty Store',
   'Shop men''s grooming at Kuthari Beauty Store. Shaving and beard care, face wash, hair styling and grooming kits. Retail or bulk.'),

  ('Bath & Body', 'bath-body',
   'Soap, body wash, lotions, talc and hand care.',
   8, true,
   'Buy Bath & Body Products Online — Soap, Body Wash, Lotion | Kuthari Beauty Store',
   'Shop bath and body at Kuthari Beauty Store. Soap, body wash, lotions, talc and hand care. Buy single or in bulk.'),

  ('Salon & Parlour', 'salon-parlour',
   'Professional salon and parlour supplies — waxing, bleach, facial kits and treatments.',
   9, true,
   'Salon & Parlour Products Supplier | Kuthari Beauty Store',
   'Professional salon and parlour supplies at Kuthari Beauty Store. Waxing, bleach, facial kits and treatments. Bulk rates for salons and parlours.'),

  ('Beauty Tools', 'beauty-tools',
   'Brushes, sponges, combs, hair dryers, trimmers and beauty accessories.',
   10, true,
   'Buy Beauty Tools & Accessories Online | Kuthari Beauty Store',
   'Shop beauty tools at Kuthari Beauty Store. Brushes, sponges, combs, dryers, trimmers and accessories. Retail or bulk.'),

  ('Baby & Kids Care', 'baby-kids-care',
   'Gentle baby soap, shampoo, lotion, oil and powder.',
   11, true,
   'Buy Baby Care Products Online — Soap, Shampoo, Lotion | Kuthari Beauty Store',
   'Shop baby and kids care at Kuthari Beauty Store. Gentle baby soap, shampoo, lotion, oil and powder. Single pieces or bulk.')

ON CONFLICT (slug) DO NOTHING;
