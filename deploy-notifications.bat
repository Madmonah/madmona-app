@echo off
chcp 65001 >nul
title Madmona - Wording + Notifications Deploy
color 0A
setlocal

echo.
echo  ================================================================
echo   Madmona - Wording Update + Push Notifications Deploy
echo  ================================================================
echo.
echo   Changes in this deploy:
echo   1. "ضيف الليستنج" instead of "أجر معانا" (TopNav, Banner)
echo   2. Landing page mua.html updated (now points to /add-listing)
echo   3. Vercel cron every minute to process push notifications
echo   4. API endpoint accepts Vercel cron auth
echo.
echo   Note: DB trigger for notifications is already LIVE.
echo.

cd /d C:\madmona-app
echo  [INFO] Working in: %CD%
echo.

REM ===== STEP 1: Verify all changed files =====
echo  ================================================================
echo   STEP 1/7: Verify all changed files exist
echo  ================================================================
set MISSING=0

if not exist "src\components\TopNav.tsx" ( echo  [ERROR] TopNav.tsx NOT FOUND & set MISSING=1 )
if not exist "src\components\WelcomeSupplierBanner.tsx" ( echo  [ERROR] WelcomeSupplierBanner.tsx NOT FOUND & set MISSING=1 )
if not exist "public\mua.html" ( echo  [ERROR] mua.html NOT FOUND & set MISSING=1 )
if not exist "src\app\api\push\process-queue\route.ts" ( echo  [ERROR] process-queue route NOT FOUND & set MISSING=1 )
if not exist "vercel.json" ( echo  [ERROR] vercel.json NOT FOUND & set MISSING=1 )

if "%MISSING%"=="1" (
  echo.
  echo  [ABORT] Some files are missing. Tell Claude.
  pause
  exit /b 1
)
echo  [OK] All 5 files present
echo.

REM ===== STEP 2: Create safety backup =====
echo  ================================================================
echo   STEP 2/7: Create safety backup branch
echo  ================================================================
git branch backup-before-notifications-update 2>nul
if errorlevel 1 (
  echo  [OK] Backup branch already exists
) else (
  echo  [OK] Created backup branch 'backup-before-notifications-update'
)
echo  [INFO] To rollback: git reset --hard backup-before-notifications-update
echo.

REM ===== STEP 3: Show current git status =====
echo  ================================================================
echo   STEP 3/7: Current git status
echo  ================================================================
git status --short
echo.

REM ===== STEP 4: Stage changes =====
echo  ================================================================
echo   STEP 4/7: Stage all changes
echo  ================================================================
git add src/components/TopNav.tsx
git add src/components/WelcomeSupplierBanner.tsx
git add public/mua.html
git add src/app/api/push/process-queue/route.ts
git add vercel.json
echo  [OK] Files staged
echo.

REM ===== STEP 5: Show staged =====
echo  ================================================================
echo   STEP 5/7: Verify staged changes
echo  ================================================================
git diff --cached --stat
echo.

REM ===== STEP 6: Commit =====
echo  ================================================================
echo   STEP 6/7: Commit changes
echo  ================================================================
git commit -m "feat: Rename 'أجر معانا' to 'ضيف الليستنج' + push notifications for new listings"
if errorlevel 1 (
  echo  [WARNING] Commit returned error - possibly nothing new to commit
)
echo.

REM ===== STEP 7: Push =====
echo  ================================================================
echo   STEP 7/7: Push to GitHub
echo  ================================================================
git push origin main
if errorlevel 1 (
  echo.
  echo  [ERROR] Push failed! Try: git pull origin main --no-edit, then re-run.
  pause
  exit /b 1
)

REM ===== SUCCESS =====
echo.
echo  ================================================================
echo   DEPLOY COMPLETE
echo  ================================================================
echo.
echo   Vercel will auto-deploy in 60-120 seconds.
echo.
echo   IMPORTANT - DO THESE ON YOUR PHONE AFTER VERCEL DEPLOY:
echo.
echo   1. Open: https://madmonacairo.com/account
echo   2. Sign in (Mohamed / admin)
echo   3. Find the "Notifications" / bell icon
echo   4. Tap "فعّل الإشعارات" (Enable Notifications)
echo   5. Allow when browser asks
echo.
echo   After step 5, you'll get a push notification on your phone
echo   every time someone submits a listing via /add-listing.
echo.
echo   ROLLBACK if needed:
echo   git reset --hard backup-before-notifications-update
echo.
pause
