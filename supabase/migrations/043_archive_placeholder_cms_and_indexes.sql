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
