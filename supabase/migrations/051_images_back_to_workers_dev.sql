-- ════════════════════════════════════════════════════════════════════════════
-- 051 · Image URLs back to the workers.dev address (temporary)
-- ════════════════════════════════════════════════════════════════════════════
-- media.kutharibeauty.com works on public DNS, but some ISPs still cache the
-- domain's old Hostinger nameservers (up to ~48 h after the move to
-- Cloudflare) and cannot resolve it, so their customers saw no images. The same
-- Worker serves the same files on workers.dev, which resolves everywhere.
-- Once the nameserver change has spread, run 050 again to move back.
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  old_prefix text := 'https://media.kutharibeauty.com/';
  new_prefix text := 'https://kuthari-media.kuthari-dev.workers.dev/';
BEGIN
  UPDATE public.products
     SET images = replace(images::text, old_prefix, new_prefix)::text[]
   WHERE images::text LIKE '%' || old_prefix || '%';

  UPDATE public.banners
     SET image_url = replace(image_url, old_prefix, new_prefix)
   WHERE image_url LIKE old_prefix || '%';

  UPDATE public.abandoned_carts
     SET cart_items = replace(cart_items::text, old_prefix, new_prefix)::jsonb
   WHERE cart_items::text LIKE '%' || old_prefix || '%';

  UPDATE public.order_issues
     SET photos = replace(photos::text, old_prefix, new_prefix)::text[]
   WHERE photos::text LIKE '%' || old_prefix || '%';
END $$;
