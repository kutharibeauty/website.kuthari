-- ════════════════════════════════════════════════════════════════════════════
-- 049 · Per-person switch for staff email notifications
-- ════════════════════════════════════════════════════════════════════════════
-- Every admin and super admin gets every staff email (new orders, status
-- changes, damaged-item requests, low stock, payment checks) unless they switch
-- it off in Admin → Admin Profiles. email_locked keeps it on for good: the app
-- refuses to switch a locked person off and has no way to unlock them.
--
-- Vinay (the owner) is locked on. Additive only; existing rows default to on.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS email_locked        boolean NOT NULL DEFAULT false;

UPDATE public.admin_profiles
   SET email_notifications = true, email_locked = true
 WHERE id = 'd5c894d5-d1e7-4e6d-8d5c-78592bab655d'; -- Vinay
