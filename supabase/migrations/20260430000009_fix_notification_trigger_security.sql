-- ==========================================================================
-- Madmona — Fix notification trigger security context
--
-- BUG: Customers (non-admin users) couldn't create marketplace bookings.
-- They got: "new row violates row-level security policy"
--
-- ROOT CAUSE:
-- The AFTER INSERT trigger trg_notify_booking_created fires the function
-- queue_booking_created_notification, which inserts a row into
-- notification_queue. The function was created with the default
-- SECURITY INVOKER, so it ran with the *caller's* permissions (the
-- customer). The RLS policy "admins_insert_queue" on notification_queue
-- only allows admins to INSERT, so the trigger failed → the entire
-- booking INSERT was rolled back.
--
-- Same issue affects queue_booking_status_change_notification, which
-- fires from the AFTER UPDATE OF status trigger
-- (trg_notify_booking_status). When a non-admin updates booking status,
-- the trigger fails for the same reason.
--
-- FIX: Make both functions SECURITY DEFINER. They now run with the
-- privileges of their owner (postgres), bypassing RLS on
-- notification_queue. SET search_path = public is added as a safety
-- measure to prevent search-path hijacking attacks (best practice for
-- any SECURITY DEFINER function).
--
-- Detected and applied to production via Supabase SQL editor on
-- 2026-05-03 while debugging a customer-side booking failure. This
-- migration file exists so the fix isn't lost on a database reset or
-- when deploying to a fresh environment.
-- ==========================================================================

ALTER FUNCTION public.queue_booking_created_notification()
  SECURITY DEFINER
  SET search_path = public;

ALTER FUNCTION public.queue_booking_status_change_notification()
  SECURITY DEFINER
  SET search_path = public;

-- Verification: both should report prosecdef = true
SELECT
  proname,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname IN (
  'queue_booking_created_notification',
  'queue_booking_status_change_notification'
);

SELECT 'Notification trigger functions are now SECURITY DEFINER' AS status;
