-- ════════════════════════════════════════════════════════════════════════════
-- 050 · Image URLs onto the shop's own media domain
-- ════════════════════════════════════════════════════════════════════════════
-- The kuthari-media Worker now also answers on media.kutharibeauty.com (the
-- domain moved to Cloudflare). Same files, same paths; only the host changes,
-- so the workers.dev address keeps working for anything already cached.
-- Swap the two prefixes to revert.
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  old_prefix text := 'https://kuthari-media.kuthari-dev.workers.dev/';
  new_prefix text := 'https://media.kutharibeauty.com/';
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
