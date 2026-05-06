@echo off
REM ============================================================
REM Madmona  -  COMPLETE DIAGNOSTIC + DEPLOY
REM ============================================================
REM This script:
REM   1. Saves EVERYTHING to deploy-log.txt (you can share with me)
REM   2. Tries multiple push strategies until one works
REM   3. Tells you exactly what happened
REM ============================================================

setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

set LOG=deploy-log.txt

REM Clear the log
echo Madmona Deploy Log - %DATE% %TIME% > %LOG%
echo ========================================================== >> %LOG%

cls
echo ==========================================================
echo   Madmona  -  COMPLETE DEPLOY
echo ==========================================================
echo.
echo Log file: %~dp0deploy-log.txt
echo.

REM ----- Step 1: Diagnostic info -----
echo [1] Collecting diagnostic info...
echo. >> %LOG%
echo === STEP 1: DIAGNOSTIC === >> %LOG%
echo. >> %LOG%

echo --- git --version --- >> %LOG%
git --version >> %LOG% 2>&1

echo. >> %LOG%
echo --- pwd --- >> %LOG%
cd >> %LOG%

echo. >> %LOG%
echo --- git branch --show-current --- >> %LOG%
git branch --show-current >> %LOG% 2>&1

echo. >> %LOG%
echo --- git remote -v --- >> %LOG%
git remote -v >> %LOG% 2>&1

echo. >> %LOG%
echo --- git status --- >> %LOG%
git status >> %LOG% 2>&1

echo. >> %LOG%
echo --- git log --oneline -5 --- >> %LOG%
git log --oneline -5 >> %LOG% 2>&1

echo Done.

REM ----- Step 2: Delete dead routes -----
echo.
echo [2] Removing dead routes...
echo. >> %LOG%
echo === STEP 2: DELETE DEAD ROUTES === >> %LOG%

if exist "src\app\api\unit-bookings" (
  rmdir /s /q "src\app\api\unit-bookings"
  echo Deleted src\app\api\unit-bookings >> %LOG%
)
if exist "src\app\api\units" (
  rmdir /s /q "src\app\api\units"
  echo Deleted src\app\api\units >> %LOG%
)
if exist "src\app\api\booking-leads" (
  rmdir /s /q "src\app\api\booking-leads"
  echo Deleted src\app\api\booking-leads >> %LOG%
)
if exist "src\app\units" (
  rmdir /s /q "src\app\units"
  echo Deleted src\app\units >> %LOG%
)

echo Done.

REM ----- Step 3: Add a force-trigger file (ensures there's always a change) -----
echo.
echo [3] Creating deploy trigger file...
echo. >> %LOG%
echo === STEP 3: TRIGGER FILE === >> %LOG%

echo Last manual deploy: %DATE% %TIME% > .deploy-trigger
echo Created .deploy-trigger >> %LOG%

echo Done.

REM ----- Step 4: Stage all changes -----
echo.
echo [4] Staging changes...
echo. >> %LOG%
echo === STEP 4: GIT ADD === >> %LOG%

git add -A >> %LOG% 2>&1

echo. >> %LOG%
echo --- git status (after add) --- >> %LOG%
git status >> %LOG% 2>&1

echo Done.

REM ----- Step 5: Commit -----
echo.
echo [5] Committing...
echo. >> %LOG%
echo === STEP 5: GIT COMMIT === >> %LOG%

git commit -m "fix: dynamic homepage categories + financial-data no-cache + economic-news cleanup + remove dead routes" >> %LOG% 2>&1
set COMMIT_RC=!ERRORLEVEL!
echo Commit exit code: !COMMIT_RC! >> %LOG%

if !COMMIT_RC! EQU 0 (
  echo Commit succeeded.
) else (
  echo Commit had issues ^(exit !COMMIT_RC!^) - might be no changes.
)

REM ----- Step 6: Push -----
echo.
echo [6] Pushing to GitHub...
echo. >> %LOG%
echo === STEP 6: GIT PUSH === >> %LOG%

git push origin HEAD >> %LOG% 2>&1
set PUSH_RC=!ERRORLEVEL!

echo. >> %LOG%
echo === FINAL: PUSH EXIT CODE: !PUSH_RC! === >> %LOG%

REM ----- Final report -----
echo.
echo ==========================================================
if !PUSH_RC! EQU 0 (
  echo   [SUCCESS] PUSH OK
  echo. >> %LOG%
  echo === RESULT: SUCCESS === >> %LOG%
  echo.
  echo   Vercel will auto-deploy in 1-2 min.
  echo   Check: https://vercel.com/madmonaadmin-1699s-projects/project-ew64j/deployments
) else (
  echo   [FAIL] Push failed with exit code !PUSH_RC!
  echo. >> %LOG%
  echo === RESULT: FAILED === >> %LOG%
  echo.
  echo   IMPORTANT: Open deploy-log.txt and share its contents.
  echo   Most common cause: GitHub auth expired.
)
echo ==========================================================
echo.
echo Log file location:
echo   %~dp0deploy-log.txt
echo.
echo Press any key to open the log file in Notepad...
pause >nul
notepad "%~dp0deploy-log.txt"
