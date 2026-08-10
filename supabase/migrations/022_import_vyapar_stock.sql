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
