@echo off
cd /d "%~dp0"
echo ================================================================
echo   FIX: Booking RLS error for customers
echo ================================================================
echo.
echo   ROOT CAUSE FOUND:
echo   The trigger function `refresh_listing_bookings_count` ran an
echo   UPDATE on the `listings` table after every booking insert,
echo   but was NOT marked SECURITY DEFINER.
echo.
echo   Result: when a customer (not the listing owner, not an admin)
echo   inserted a booking, the AFTER INSERT trigger tried to UPDATE
echo   listings under the customer's RLS - which forbids it - and the
echo   whole transaction rolled back with:
echo.
echo     "new row violates row-level security policy for table"
echo.
echo   Admins didn't hit this because of `listings_admin_all`.
echo.
echo   FIX:
echo   Added SECURITY DEFINER + pinned search_path to 4 trigger fns
echo   that update sibling tables on behalf of users:
echo     * refresh_listing_bookings_count  (the actual blocker)
echo     * refresh_supplier_listings_count (preventive)
echo     * refresh_review_aggregates       (preventive)
echo     * enforce_single_primary_photo    (preventive)
echo.
echo   Migration: supabase/migrations/20260430000009_fix_bookings_count_trigger_security.sql
echo   DB STATUS: already applied directly via Supabase SQL Editor.
echo              This commit is for version control / re-runnability.
echo.
echo   ALSO ROLLED BACK: the diagnostic-mode error messages stay in
echo   for now in case other RLS surfaces still need uncovering. Once
echo   you confirm bookings work end-to-end with a real customer, we
echo   can ship a follow-up to revert to user-friendly Arabic errors.
echo.
echo   Test plan:
echo   1. Login as a regular customer (WhatsApp-confirmed account)
echo   2. Pick any published listing
echo   3. Click "تأكيد الحجز" - should succeed and redirect to
echo      /bookings/[id]?created=1 with InstaPay screen
echo.
pause
git add .
git commit -m "fix: customer booking RLS by hardening trigger fns with SECURITY DEFINER"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
  echo   Test the booking flow as a customer.
) else (
  echo   PUSH FAILED. Check the error above.
)
pause
