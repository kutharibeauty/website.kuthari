-- ─────────────────────────────────────────────────────────────────────────────
-- 015  Wishlists — per-customer saved products (heart button on product cards)
--
-- Service-role-only, like orders/addresses: RLS is enabled with no anon/auth
-- policies, so all access goes through the Next.js API routes using the service
-- role, scoped to the session's profile id. A unique (user_id, product_id)
-- makes add idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlists_user_idx on public.wishlists(user_id);

alter table public.wishlists enable row level security;
-- No policies on purpose: anon/authenticated get no access; the API routes use
-- the service role and scope every query to the caller's own profile id.
