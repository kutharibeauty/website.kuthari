-- ─────────────────────────────────────────────────────────────────────────────
-- KUTHARI BEAUTY STORE — Migration 003: Seed Data
-- Run AFTER 002_rls.sql
--
-- Only the super-admin account is seeded here. Categories, products,
-- serviceable pincodes and coupons are intentionally NOT seeded — the client
-- is adding their real catalog and coverage area through the admin panel
-- rather than starting from BCR Traders' old grocery demo data.
--
-- INSERT uses ON CONFLICT DO NOTHING so this file is safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── ADMIN PROFILES ───────────────────────────────────────────────────────────
-- Super Admin row must exist before the auth webhook can link the user.
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
     "view_unserviceable":       true,
     "receive_order_emails":     true,
     "export_data":              true
   }'::jsonb)
ON CONFLICT (phone) DO NOTHING;
