@echo off
REM ============================================================
REM Madmona — Cleanup + Homepage + Tickers Fix
REM ============================================================
REM 1. Removes 4 dead route folders (DB tables already dropped).
REM 2. Pushes:
REM    - Dynamic homepage categories (8 roots from DB)
REM    - Fixed financial-data API (no Vercel cache, 60s refresh)
REM    - Cleaner economic-news (removed dead RSS sources)
REM    - FinancialTicker refreshes every 60s
REM ============================================================

setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================================
echo   Madmona  -  Cleanup + Homepage + Tickers Fix
echo ==========================================================
echo.
echo This will:
echo   * Delete src\app\api\unit-bookings\
echo   * Delete src\app\api\units\
echo   * Delete src\app\api\booking-leads\
echo   * Delete src\app\units\  (frontend route)
echo   * Commit + push the homepage + tickers fix
echo.
pause

REM ----- 1. Delete dead routes -----
echo.
echo [1/5] Deleting dead API/frontend routes...
if exist "src\app\api\unit-bookings" (
  rmdir /s /q "src\app\api\unit-bookings"
  echo    [-] src\app\api\unit-bookings
)
if exist "src\app\api\units" (
  rmdir /s /q "src\app\api\units"
  echo    [-] src\app\api\units
)
if exist "src\app\api\booking-leads" (
  rmdir /s /q "src\app\api\booking-leads"
  echo    [-] src\app\api\booking-leads
)
if exist "src\app\units" (
  rmdir /s /q "src\app\units"
  echo    [-] src\app\units
)

REM ----- 2. Git add -----
echo.
echo [2/5] Staging changes...
git add .

REM ----- 3. Git commit -----
echo.
echo [3/5] Committing...
git commit -m "fix: financial-data + economic-news refresh on every load + dynamic homepage categories + cleanup dead routes"

REM ----- 4. Git push -----
echo.
echo [4/5] Pushing to GitHub (Vercel auto-deploys)...
git push

REM ----- 5. Done -----
echo.
echo ==========================================================
if %ERRORLEVEL% EQU 0 (
  echo   [5/5] DONE. Vercel will deploy in 1-2 min.
  echo.
  echo   What you'll see after deploy:
  echo.
  echo   1. Homepage shows ALL 8 categories ^(not just 5^)
  echo      Including: Marine, Weddings, Recreation, Media
  echo.
  echo   2. Currency ticker refreshes every 60 seconds
  echo      USD/EUR/GBP/SAR rates always fresh
  echo      Gold prices ^(24K/21K/18K^) always fresh
  echo.
  echo   3. News ticker refreshes every 2 minutes
  echo      No more stale articles
  echo      Faster ^(removed 17 dead RSS sources^)
  echo.
  echo   Test it:
  echo     https://madmonacairo.com/
  echo     https://madmonacairo.com/api/financial-data
  echo     https://madmonacairo.com/api/economic-news?debug=1
) else (
  echo   PUSH FAILED. Check the error above.
)
echo ==========================================================
pause
