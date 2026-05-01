@echo off
cd /d "%~dp0"
echo ================================================================
echo   Tier 5: Admin Broadcast Notifications System
echo ================================================================
echo.
echo   NEW: /admin/notifications page
echo   * Send custom push notifications to:
echo     - Single user (search by name/phone)
echo     - Group of selected users (multi-pick)
echo     - All customers
echo     - All suppliers
echo     - All users
echo   * 4 quick templates (offers, reminders, updates, thanks)
echo   * Live preview of the notification
echo   * Shows who has push enabled vs not
echo   * Custom URL for click destination
echo.
echo   DB: 5 new RLS policies on notification_queue + push_subscriptions
echo   * Admins can insert/view notification queue
echo   * Users can view their own queue items
echo   * Service role bypass for cron processing
echo   * Admins can see all subscriptions for stats
echo.
echo   ADMIN DASHBOARD:
echo   * New "التواصل والإشعارات" section
echo   * Shows total push subscribers count
echo   * Direct link to /admin/notifications
echo.
pause
git add .
git commit -m "feat: admin broadcast notifications page + RLS policies"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED.
)
pause
