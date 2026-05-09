@echo off
REM ============================================================
REM Deploy Schema Fix (column names match actual DB schema)
REM ============================================================

cd /d "%~dp0"

echo ==============================================
echo   Madmona — Schema Fix Deploy
echo ==============================================
echo.
echo Fixing column name mismatches between code and DB:
echo   - title_ar/title_en   to title
echo   - description_ar/_en  to description
echo   - address_ar          to address
echo   - min_capacity        to min_booking_hours
echo   - photo_url           to url (listing_photos)
echo   - caption_ar          to caption
echo   - view_count          to views_count
echo   - period types        to hourly/daily/weekly/monthly/per_event
echo   - removed starting_price (computed from pricing_rules)
echo.
pause

echo.
echo [1/3] Adding changes...
git add .

echo.
echo [2/3] Committing...
git commit -m "fix: align Phase 1c code with actual DB schema column names"

echo.
echo [3/3] Pushing to GitHub (Vercel will auto-deploy)...
git push

echo.
echo ==============================================
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Vercel is now deploying...
  echo.
  echo   IMPORTANT: Run migration #6 in Supabase SQL Editor:
  echo     C:\madmona-app\supabase\migrations\20260430000006_fix_view_count.sql
  echo.
  echo   Then test:
  echo     https://madmonacairo.com/supplier/marketplace
  echo     https://madmonacairo.com/supplier/marketplace/new
) else (
  echo   PUSH FAILED. Check the error above.
)
echo ==============================================
pause
