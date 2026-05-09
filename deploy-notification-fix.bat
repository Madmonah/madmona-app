@echo off
cd /d "%~dp0"
echo ================================================================
echo   Save Notification Trigger Security Fix Migration
echo ================================================================
echo.
echo   WHAT THIS COMMITS:
echo   * supabase/migrations/20260430000009_fix_notification_trigger_security.sql
echo.
echo   WHY:
echo   The fix is already applied to production database (run via the
echo   Supabase SQL editor while debugging the booking RLS issue).
echo.
echo   This migration file documents the fix so:
echo   1. It's recorded in version control with the explanation.
echo   2. A future db reset or fresh environment will re-apply it.
echo   3. The team has a clear audit trail.
echo.
echo   THE FIX (one line each):
echo   ALTER FUNCTION queue_booking_created_notification SECURITY DEFINER
echo   ALTER FUNCTION queue_booking_status_change_notification SECURITY DEFINER
echo.
echo   This was the root cause of customer bookings failing with
echo   "row level security policy" — the AFTER INSERT trigger inserted
echo   into notification_queue with the customer's permissions, and the
echo   admin-only RLS on notification_queue rolled the whole booking back.
echo.
pause
echo.
echo Staging the migration file...
git add supabase/migrations/20260430000009_fix_notification_trigger_security.sql
git commit -m "fix: SECURITY DEFINER on booking notification triggers (was blocking customer bookings via RLS)"
echo.
echo Pushing to GitHub...
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   PUSHED. Migration is now in the repo.
) else (
  echo   PUSH FAILED. Check the error above.
)
pause
