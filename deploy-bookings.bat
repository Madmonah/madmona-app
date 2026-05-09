@echo off
cd /d "%~dp0"
echo ==============================================
echo   Madmona — Deploy Bookings + Reviews
echo ==============================================
echo.
echo Adding the booking flow:
echo   - /marketplace/[slug]/book        (create booking)
echo   - /account/bookings               (customer's bookings list)
echo   - /account/bookings/[id]          (booking detail + review)
echo   - /supplier/marketplace/bookings  (supplier sees bookings)
echo   - /supplier/marketplace/bookings/[id] (confirm/cancel)
echo.
echo Updating:
echo   - /marketplace/[slug] (Book button + reviews)
echo   - /supplier/marketplace (bookings tab nav)
echo.
pause
git add .
git commit -m "feat: complete booking flow with reviews (final shape)"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
  echo.
  echo   Test pages:
  echo     /marketplace                       (browse)
  echo     /marketplace/[slug]/book           (book)
  echo     /account/bookings                  (my bookings)
  echo     /supplier/marketplace/bookings     (supplier bookings)
) else (
  echo   PUSH FAILED.
)
pause
