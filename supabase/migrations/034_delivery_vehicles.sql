-- 034: admin-managed delivery lorries/vehicles + per-order transport details.
--
-- The admin maintains a list of lorries (number, name, phone, active). At
-- checkout the customer either picks one of the active lorries or types their
-- own transport details; the chosen text is snapshotted onto the order so the
-- invoice reflects exactly what was selected at order time (a later edit to the
-- vehicle list never rewrites a past invoice).

CREATE TABLE IF NOT EXISTS delivery_vehicles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number        TEXT NOT NULL,               -- e.g. OD-07-AB-1234
  name          TEXT,                        -- transporter / driver name
  phone         TEXT,                        -- contact number
  is_active     BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_vehicles_active
  ON delivery_vehicles (display_order) WHERE is_active = true;

-- Text snapshot of the transport chosen for this order (a picked lorry formatted
-- as "number · name · phone", or the customer's own typed details). NULL when
-- none was chosen.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS transport_details TEXT;

-- Reference data reached only through admin-gated routes (service role) plus a
-- public read of the ACTIVE list for checkout. RLS on with no policy blocks
-- direct anon/authenticated access; the service role bypasses it.
ALTER TABLE delivery_vehicles ENABLE ROW LEVEL SECURITY;
