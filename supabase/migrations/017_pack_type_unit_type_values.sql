-- ─────────────────────────────────────────────────────────────────────────────
-- Widen the products.pack_type / products.unit_type CHECK constraints to the
-- full set of packaging values the catalogue now uses. The old constraints only
-- allowed Box/Bag, which blocked importing products with Box/Bale, Tin/Can,
-- Hanger, Piece (error 23514 products_pack_type_check).
--
-- Safe & idempotent: drops the old constraints if present and re-adds the
-- expanded ones. Run this BEFORE importing products_rows.csv.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pack_type_check;
ALTER TABLE products ADD CONSTRAINT products_pack_type_check
  CHECK (
    pack_type IS NULL OR pack_type IN (
      'Box', 'Box/Bale', 'Bag', 'Tin/Can', 'Hanger', 'Piece'
    )
  );

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_type_check;
ALTER TABLE products ADD CONSTRAINT products_unit_type_check
  CHECK (
    unit_type IS NULL OR unit_type IN (
      'Piece', 'Pieces', 'Packet', 'Pack', 'Bag', 'Sachet',
      'Pouch', 'Bottle', 'Bottle/Pouch', 'Jar', 'Tin', 'Tin/Can'
    )
  );
