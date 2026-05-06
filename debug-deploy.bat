@echo off
REM ============================================================
REM Madmona  -  DEBUG + FORCE DEPLOY
REM Diagnose why the previous deploy didn't take effect.
REM ============================================================

setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================================
echo   Madmona  -  DEBUG + FORCE DEPLOY
echo ==========================================================
echo.
echo This will:
echo   1. Show git status (uncommitted changes)
echo   2. Show latest 5 commits
echo   3. Show current branch
echo   4. Stage + commit + push everything
echo.
pause

REM ----- 1. Git status -----
echo.
echo [1/6] === GIT STATUS ===
git status

echo.
echo [2/6] === LATEST 5 COMMITS ===
git log --oneline -5

echo.
echo [3/6] === CURRENT BRANCH ===
git branch --show-current

echo.
echo [4/6] === REMOTE INFO ===
git remote -v

echo.
echo Press any key to delete dead routes and force commit + push...
pause

REM ----- Delete dead routes -----
echo.
echo [5/6] === DELETING DEAD ROUTES ===
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

REM ----- Stage + Commit + Push (with verbose) -----
echo.
echo [6/6] === STAGING + COMMITTING + PUSHING ===
git add -A
git status --short
echo.
git commit -m "fix: dynamic homepage categories + financial-data no-cache + economic-news cleanup + remove dead routes"
echo.
echo Pushing to origin main (or current branch)...
git push origin HEAD --verbose

echo.
echo ==========================================================
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 minutes and check:
  echo     https://vercel.com/madmonaadmin-1699s-projects/project-ew64j
  echo.
  echo   The latest deployment should have a NEW commit hash.
) else (
  echo   PUSH FAILED. Read the error above carefully.
  echo   Common reasons:
  echo     - No changes ^(everything was already committed^)
  echo     - Network issue
  echo     - Wrong branch ^(maybe not 'main'^)
  echo     - Auth ^(GitHub credentials expired^)
)
echo ==========================================================
pause
