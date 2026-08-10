-- 028: official India Post directory for Ganjam district (data.gov.in).
--
-- Backs the area <-> pincode lookup on the admin "Serviceable PINs" screen.
-- Previously that screen called api.postalpincode.in on every keystroke-ish
-- lookup: a network hop with a 6s timeout that could fail, and whose area
-- search needs a near-exact name rather than a prefix. This is reference data
-- that changes maybe once a year, so it belongs in our own DB.
--
-- This is a LOOKUP/reference table only. It does NOT decide serviceability —
-- serviceable_pincodes remains the single source of truth for that. An admin
-- picks from here, then the chosen row is saved into serviceable_pincodes.

CREATE TABLE IF NOT EXISTS ganjam_post_offices (
  id          BIGSERIAL PRIMARY KEY,
  pincode     TEXT NOT NULL CHECK (pincode ~ '^\d{6}$'),
  area_name   TEXT NOT NULL,
  office_type TEXT,
  sub_office  TEXT,
  division    TEXT,
  -- The same place name legitimately repeats across pincodes in this district,
  -- so the identity is the pair, not the name.
  UNIQUE (pincode, area_name)
);

CREATE INDEX IF NOT EXISTS idx_gpo_pincode ON ganjam_post_offices (pincode);

-- Substring search on the area name ("nuagam" should find "Gosaninuagam B.O"),
-- which a plain b-tree can't serve. Trigram GIN handles ILIKE '%x%'.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_gpo_area_trgm ON ganjam_post_offices USING gin (area_name gin_trgm_ops);

-- Reference data reached only through the admin-gated /api/pincodes/lookup
-- route, which uses the service-role client. RLS on with no policy = no direct
-- anon/authenticated access; the service role bypasses it.
ALTER TABLE ganjam_post_offices ENABLE ROW LEVEL SECURITY;
