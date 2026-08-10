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
