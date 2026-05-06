@echo off
REM ============================================================
REM Madmona — Cleanup + Homepage Categories Fix
REM ============================================================
REM 1. Removes 4 dead route folders (DB tables already dropped).
REM 2. Pushes homepage that reads categories dynamically from DB.
REM    (8 root categories will now show, including Marine, Weddings,
REM     Recreation, Media — instead of the old 5 hardcoded ones.)
REM ============================================================

setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================================
echo   Madmona  -  Cleanup + Homepage Fix
echo ==========================================================
echo.
echo This will:
echo   * Delete src\app\api\unit-bookings\
echo   * Delete src\app\api\units\
echo   * Delete src\app\api\booking-leads\
echo   * Delete src\app\units\  (frontend route)
echo   * Commit + push the homepage fix
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
git commit -m "cleanup: remove dead routes (unit-bookings, units, booking-leads) + dynamic homepage categories"

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
  echo   Check it:
  echo     https://madmonacairo.com/
  echo.
  echo   You should now see all 8 categories on the homepage:
  echo     - Mobile: 2-column grid
  echo     - Desktop: 1 large + 7 small
  echo.
  echo   Categories ^(in display order^):
  echo     1. Media
  echo     2. Workspaces
  echo     3. Properties
  echo     4. Vehicles
  echo     5. Equipment
  echo     6. Weddings
  echo     7. Recreation
  echo     8. Marine
) else (
  echo   PUSH FAILED. Check the error above.
)
echo ==========================================================
pause
