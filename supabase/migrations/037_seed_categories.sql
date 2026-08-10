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
