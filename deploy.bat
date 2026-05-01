@echo off
cd /d "%~dp0"
echo ================================================================
echo   Tier 4: Staff Permissions Wired Across All Supplier Pages
echo            + Email Triggers on Booking Events
echo ================================================================
echo.
echo   STAFF PERMISSIONS APPLIED:
echo   * /supplier/marketplace        — owner + staff (already done)
echo   * /supplier/marketplace/new    — needs can_manage_listings
echo   * /supplier/marketplace/[id]/edit — needs can_manage_listings
echo   * /supplier/marketplace/bookings — needs can_manage_bookings
echo   * /supplier/marketplace/reviews — view always; respond needs perm
echo   * /bookings/[id]               — staff with can_manage_bookings
echo                                     can confirm/cancel
echo.
echo   Each page shows a blue banner when the user is staff (not owner)
echo   indicating their role. Restricted buttons are hidden gracefully.
echo.
echo   EMAIL TRIGGERS (Resend):
echo   * New API endpoint: POST /api/bookings/notify
echo   * Body: ^{ booking_id, event: 'created' ^| 'confirmed' ^}
echo   * Auth: user JWT or CRON_SECRET
echo   * Booking creation page fires email to supplier
echo   * Booking detail page fires email to customer on confirm
echo   * All emails graceful: no-op if RESEND_API_KEY missing
echo   * Reads emails from auth.users via service role
echo   * Skips synthesized madmonacairo.com phone-emails
echo.
pause
git add .
git commit -m "feat: wire staff permissions across supplier pages + email triggers"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED.
)
pause
