-- ── Replace Clerk with Supabase Auth as the single identity provider ────────
-- Every person (customer, admin, delivery) becomes a Supabase auth.users row,
-- created after a Message Central phone-OTP verification. Role/profile
-- linkage lives in `profiles` (customers) and `admin_profiles` (staff).
--
-- Pre-launch: profiles/orders/addresses/etc are test data keyed to Clerk user
-- ids that have no Supabase auth.users counterpart, so this migration clears
-- them (TRUNCATE ... CASCADE) rather than attempting a dead migration path.
-- admin_profiles (staff roster: name/phone/role/permissions) is preserved —
-- only the incompatible clerk_user_id column is dropped; staff re-link on
-- their next phone-OTP login (same healing pattern as new customer signups).

-- ── profiles (customers) ────────────────────────────────────────────────────
TRUNCATE TABLE profiles CASCADE;

ALTER TABLE profiles DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── admin_profiles (super_admin / admin / delivery staff) ───────────────────
ALTER TABLE admin_profiles DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE admin_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS admin_profiles_user_id_idx
  ON admin_profiles(user_id) WHERE user_id IS NOT NULL;

-- ── OTP verification binding ─────────────────────────────────────────────────
-- Binds a Message Central verificationId to the phone it was issued for
-- (one-shot, prevents cross-phone OTP replay / account takeover).
CREATE TABLE IF NOT EXISTS otp_verifications (
  verification_id TEXT PRIMARY KEY,
  phone_digits     TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL,
  consumed_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS otp_verifications_phone_idx   ON otp_verifications (phone_digits);
CREATE INDEX IF NOT EXISTS otp_verifications_expires_idx ON otp_verifications (expires_at);

-- Service-role only — no policies, RLS blocks anon/authenticated entirely.
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
