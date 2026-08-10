-- ─────────────────────────────────────────────────────────────────────────────
-- 014  Atomic stock decrement + coupon usage increment
--
-- PRD Rule #1 / §1.6 (data integrity). The order route previously decremented
-- stock and incremented coupon usage with a read-then-write pattern, which under
-- two concurrent orders can lose an update (both read the old value, both write
-- old-1) → overselling / coupons exceeding max_uses. These functions make each
-- operation a single atomic UPDATE guarded by a WHERE clause, so the database —
-- not the app — enforces "never below zero" and "never past max_uses".
-- ─────────────────────────────────────────────────────────────────────────────

-- Decrease stock only if there is enough; returns the new stock level, or NULL
-- if the guard failed (insufficient stock) so the caller can tell it didn't apply.
create or replace function public.decrement_product_stock(p_product_id uuid, p_qty int)
returns int
language sql
as $$
  update products
     set stock_qty = stock_qty - p_qty,
         updated_at = now()
   where id = p_product_id
     and stock_qty >= p_qty
  returning stock_qty;
$$;

-- Increase a product's stock (used when an order is cancelled/returned).
create or replace function public.increment_product_stock(p_product_id uuid, p_qty int)
returns int
language sql
as $$
  update products
     set stock_qty = stock_qty + p_qty,
         updated_at = now()
   where id = p_product_id
  returning stock_qty;
$$;

-- Increment coupon usage only while under max_uses (NULL max_uses = unlimited).
-- Returns TRUE if the increment applied, FALSE if the coupon is already maxed.
create or replace function public.increment_coupon_use(p_coupon_id uuid)
returns boolean
language plpgsql
as $$
declare
  affected int;
begin
  update coupons
     set uses_count = coalesce(uses_count, 0) + 1
   where id = p_coupon_id
     and (max_uses is null or coalesce(uses_count, 0) < max_uses);
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;
