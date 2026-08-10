-- ─────────────────────────────────────────────────────────────────────────────
-- 016  Shopping lists — a per-customer notes/checklist saved on the user side
--      and surfaced to admins next to abandoned carts (a purchase-intent signal).
--
-- One row per customer; `items` is a JSONB array of { id, text, done }.
-- Service-role-only (RLS on, no anon/auth policies) — accessed via API routes
-- scoped to the caller's profile id.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.shopping_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  items       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

create index if not exists shopping_lists_updated_idx on public.shopping_lists(updated_at desc);

alter table public.shopping_lists enable row level security;
-- No policies on purpose — API routes use the service role, scoped per profile.
