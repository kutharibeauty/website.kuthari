-- 038: Category artwork, and drop Baby & Kids Care.
--
-- The client does not stock baby/kids care, so the category is removed. The
-- DELETE is guarded: products.category_id is ON DELETE RESTRICT, so if anything
-- was ever filed under it the delete would fail rather than orphan stock. It is
-- therefore only removed when empty — check the admin panel if it survives.
--
-- Artwork is the designed brand tiles in public/images/categories/. They are
-- placeholders, not product photography — the admin can replace any of them
-- from Admin -> Categories without touching this migration.

DELETE FROM categories
 WHERE slug = 'baby-kids-care'
   AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = categories.id);

UPDATE categories SET image_url = '/images/categories/' || slug || '.webp'
 WHERE slug IN (
   'skincare', 'haircare', 'hair-colour', 'makeup', 'nail-care',
   'fragrances-deodorants', 'mens-grooming', 'bath-body',
   'salon-parlour', 'beauty-tools'
 )
 -- Never overwrite a real photo the admin has already uploaded.
 AND (image_url IS NULL OR image_url = '');
