-- ─────────────────────────────────────────────────────────────────────────────
-- Paste this whole file into the Supabase SQL editor and run it.
--
-- It CHANGES NOTHING. It only inspects the live database and prints one row per
-- feature telling you whether its migration still needs running. Use it whenever
-- you're unsure what's applied — guessing is what caused the 23514 and the
-- "Failed to create order" loops.
-- ─────────────────────────────────────────────────────────────────────────────

WITH checks(sort, migration, feature, ok) AS (
  VALUES
    (1, '021_pack_type_add_pack_bottle.sql',
        'pack_type allows Pack/Bottle (needed by the Vyapar import)',
        COALESCE((SELECT pg_get_constraintdef(oid) LIKE '%''Pack''%'
                    FROM pg_constraint WHERE conname = 'products_pack_type_check'), true)),

    (2, '020_packaging_levels.sql',
        'products.pieces_per_secondary / secondary_price',
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='products' AND column_name='pieces_per_secondary')),

    (3, '014_spices_hanger_pack.sql',
        'products.units_per_hanger / hangers_per_pack (Box -> Hanger -> Piece)',
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='products' AND column_name='units_per_hanger')),

    (4, '022_import_vyapar_stock.sql',
        'Vyapar packaging + prices imported (spot-check: Ev Chicken Masala)',
        EXISTS (SELECT 1 FROM products
                 WHERE name='Ev Chicken Masala (5)' AND hangers_per_pack IS NOT NULL)),

    (5, '023_fix_order_number_ambiguous_fy.sql',
        'ORDER PLACEMENT — fixes: column reference "fy" is ambiguous',
        EXISTS (SELECT 1 FROM pg_proc WHERE proname='generate_order_number'
                 AND pg_get_functiondef(oid) LIKE '%v_fy%')),

    (6, '024_fix_coupon_double_increment.sql',
        'Coupons counted once per order, not twice',
        NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_orders_coupon_uses')),

    (7, '014_atomic_stock_coupon.sql',
        'Atomic stock decrement + guarded coupon increment',
        EXISTS (SELECT 1 FROM pg_proc WHERE proname='decrement_product_stock')),

    (8, '019_orders_returned_at.sql',
        'orders.returned_at (Returned status)',
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='orders' AND column_name='returned_at')),

    (9, '013_gst_invoice.sql',
        'orders.gstin / gst_business_name (GST bill at checkout)',
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='orders' AND column_name='gstin')),

    (10, '016_referrals.sql',
        'profiles.referral_code / referral_credit',
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='referral_code')),

    (11, '025_fix_orders_status_check.sql',
        'ORDER STATUS — allows Packed/Shipping, not just up to Confirmed',
        COALESCE((SELECT pg_get_constraintdef(oid) LIKE '%''packed''%'
                    FROM pg_constraint WHERE conname = 'orders_status_check'), true))
)
SELECT
  CASE WHEN ok THEN '  ok  ' ELSE '>> RUN' END AS status,
  migration,
  feature
FROM checks
ORDER BY ok, sort;
