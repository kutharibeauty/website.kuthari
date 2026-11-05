-- ════════════════════════════════════════════════════════════════════════════
-- 045 · Point stored image URLs at Cloudflare R2
-- ════════════════════════════════════════════════════════════════════════════
-- The product-images files were copied byte for byte into the R2 bucket
-- `kuthari-media` (same names, under product-images/), served by the
-- kuthari-media Worker. This swaps the URL prefix only. The Supabase copies are
-- left in place, so running the same replace the other way reverts it.
--
-- If the media domain changes later (e.g. media.kutharibeauty.com), run the
-- same three statements with the old Worker prefix as the "from" value.
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  old_prefix text := 'https://dhtjpfdvqrtfglualmeu.supabase.co/storage/v1/object/public/product-images/';
  new_prefix text := 'https://kuthari-media.kuthari-dev.workers.dev/product-images/';
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
END $$;
