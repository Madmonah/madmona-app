@echo off
cd /d "%~dp0"
echo ==============================================
echo   Final Stage Complete (no payment)
echo ==============================================
echo.
echo   * Realtime notifications (dashboard + bookings list)
echo   * Admin analytics dashboard
echo   * SEO + Open Graph for sharing
echo   * Search/sort: price asc/desc, rating, city filter
echo   * Listing duplication (Copy button)
echo.
pause
git add .
git commit -m "feat: realtime + analytics + SEO + filters + listing duplication"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
  echo.
  echo   IMPORTANT - Run this SQL in Supabase first:
  echo   ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_bookings;
) else (
  echo   PUSH FAILED. Check error above.
)
pause
