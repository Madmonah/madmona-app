@echo off
cd /d "%~dp0"
echo ==============================================
echo   Madmona — Closing the App (Final Push)
echo ==============================================
echo.
echo NEW: /account hub page (sign out + bookings + dashboards)
echo UPDATED: /auth/login + /auth/signup default to /account
echo UPDATED: /supplier/marketplace has account icon in header
echo.
echo BEFORE TESTING: run this SQL in Supabase SQL Editor first
echo (fixes the booking conflict bug):
echo.
echo   CREATE OR REPLACE FUNCTION public.check_booking_conflict() ...
echo   (full SQL is in the chat above)
echo.
pause
git add .
git commit -m "feat: /account hub + sign out + auth redirect + nav link"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
  echo.
  echo   TEST THE FULL APP:
  echo     1. Run the SQL fix in Supabase SQL Editor
  echo     2. Open https://madmonacairo.com/account
  echo     3. From there: bookings, marketplace, supplier panel, sign out
  echo     4. Test booking flow with conflict-free time
) else (
  echo   PUSH FAILED. Check the error above.
)
pause
