@echo off
REM ============================================================
REM Deploy Phase 2 (End-to-End Booking System)
REM ============================================================

cd /d "%~dp0"

echo ==============================================
echo   Madmona — Deploy Phase 2 (Final Form)
echo ==============================================
echo.
echo Adding:
echo   - /marketplace/[slug]/book   (booking form)
echo   - /bookings/[id]             (booking detail + actions)
echo   - /my-bookings               (customer bookings list)
echo   - /supplier/bookings         (incoming bookings for supplier)
echo.
echo Updating:
echo   - /marketplace/[slug]        (Book Now CTA)
echo   - /supplier/marketplace      (Bookings inbox link with badge)
echo.
pause

echo.
echo [1/3] Adding changes...
git add .

echo.
echo [2/3] Committing...
git commit -m "feat: Phase 2 - end-to-end booking system (customer + supplier flows)"

echo.
echo [3/3] Pushing to GitHub (Vercel will auto-deploy)...
git push

echo.
echo ==============================================
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Vercel is now deploying...
  echo.
  echo   Test the full flow:
  echo     1. Open in incognito: /marketplace
  echo     2. Open a listing - Book Now
  echo     3. Sign up as a new customer
  echo     4. Complete booking form
  echo     5. Login as supplier - check /supplier/bookings
  echo     6. Approve/reject the booking
) else (
  echo   PUSH FAILED. Check the error above.
)
echo ==============================================
pause
