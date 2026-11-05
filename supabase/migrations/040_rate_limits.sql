-- ════════════════════════════════════════════════════════════════════════════
-- 040 · Shared rate-limit counters
-- ════════════════════════════════════════════════════════════════════════════
-- src/lib/rate-limit.ts kept its counters in process memory when Upstash isn't
-- configured. On Vercel every request can land on a different instance, so
-- that memory isn't shared and the OTP limits (5 sends per phone per hour,
-- 30 per IP) never actually held, leaving SMS credits open to abuse.
--
-- This gives the app one atomic, shared counter in Postgres. Upstash still
-- wins when its env vars are set; this is the default otherwise.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key       text PRIMARY KEY,
  count     integer     NOT NULL,
  reset_at  timestamptz NOT NULL
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;  -- service role only

-- Increment `p_key` inside a fixed window of `p_window_seconds`. Returns the
-- count after this hit and the seconds left in the window. One statement, so
-- concurrent hits on the same key can't both read the old value.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key text, p_window_seconds integer)
RETURNS TABLE (hits integer, ttl_seconds integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.rate_limits AS r (key, count, reset_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE
    SET count    = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.count + 1 END,
        reset_at = CASE WHEN r.reset_at <= now() THEN now() + make_interval(secs => p_window_seconds) ELSE r.reset_at END
  RETURNING r.count, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (r.reset_at - now()))))::integer;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer) TO service_role;

-- Old windows are dead weight; clear them now and then (the daily cron does it).
CREATE OR REPLACE FUNCTION public.rate_limits_prune()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limits WHERE reset_at < now() - interval '1 day';
$$;
REVOKE ALL ON FUNCTION public.rate_limits_prune() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limits_prune() TO service_role;
