-- ── Bilingual banner fields ─────────────────────────────────────────────────
-- The admin Banner form (Banners & CMS → Banners) collects Odia copy for the
-- title, subtitle and CTA, and the generated Banner type already declares these
-- columns — but no migration ever added them. Every banner insert/update that
-- included title_or / subtitle_or / cta_text_or therefore failed with
-- `column "…_or" of relation "banners" does not exist`, so banners (and their
-- uploaded images) never saved. Add the columns idempotently.
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS title_or    TEXT,
  ADD COLUMN IF NOT EXISTS subtitle_or TEXT,
  ADD COLUMN IF NOT EXISTS cta_text_or TEXT;
