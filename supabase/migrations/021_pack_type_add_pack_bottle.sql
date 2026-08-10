-- ─────────────────────────────────────────────────────────────────────────────
-- Widen products.pack_type for the client's Vyapar stock sheet.
--
-- Its "Unit" column uses PACKS (63 products) and BOTTLES, which the existing
-- check constraint rejects — importing would fail with error 23514 exactly like
-- Box/Bale did before.
--
-- Safe & idempotent. Run BEFORE 022_import_vyapar_stock.sql.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pack_type_check;
ALTER TABLE products ADD CONSTRAINT products_pack_type_check
  CHECK (
    pack_type IS NULL OR pack_type IN (
      'Box', 'Box/Bale', 'Pack', 'Bag', 'Tin/Can', 'Hanger', 'Bottle', 'Piece'
    )
  );

-- The lower unit ("unit_type") likewise needs Hanger/Pack.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_type_check;
ALTER TABLE products ADD CONSTRAINT products_unit_type_check
  CHECK (
    unit_type IS NULL OR unit_type IN (
      'Piece', 'Pieces', 'Packet', 'Pack', 'Bag', 'Sachet', 'Hanger',
      'Pouch', 'Bottle', 'Bottle/Pouch', 'Jar', 'Tin', 'Tin/Can'
    )
  );

NOTIFY pgrst, 'reload schema';
